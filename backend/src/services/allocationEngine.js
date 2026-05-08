const { calculateTopicPriority } = require('./priorityEngine');
const { calculateRiskFactor } = require('./riskEngine');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getDayMinutes(availabilityArr) {
    return availabilityArr.reduce((total, slot) => {
        const [startH, startM] = slot.start_time.split(':').map(Number);
        const [endH, endM] = slot.end_time.split(':').map(Number);
        return total + ((endH * 60 + endM) - (startH * 60 + startM));
    }, 0);
}

async function generateStudyPlan(user_id, fullRecalculate = false, forceFullSemester = false) {
    const profile = await prisma.academicProfile.findUnique({ where: { user_id } });
    if (!profile) throw new Error("Academic Profile missing");

    const userObj = await prisma.user.findUnique({ where: { id: user_id } });
    if (!userObj) throw new Error("User missing");
    
    const postExamPref = userObj.post_exam_preference || "REST";
    const allowMorningRevision = userObj.allow_morning_revision || false;
    const currentSemester = profile.semester;

    const selectedTopics = await prisma.userTopic.findMany({
        where: { 
            user_id, 
            is_selected: true,
            is_archived: false,
            course: { semester: currentSemester }
        },
        include: { course: true }
    });
    if (selectedTopics.length === 0) throw new Error("No topics selected for study this semester");

    const availabilities = await prisma.studyAvailability.findMany({ where: { user_id } });
    if (availabilities.length === 0) throw new Error("No study availability set");

    const totalMinutes = getDayMinutes(availabilities);
    const totalAvailableWeeklyHours = totalMinutes / 60;
    if (totalAvailableWeeklyHours <= 0) throw new Error("Available hours must be greater than 0");

    const userCourses = await prisma.userCourse.findMany({ 
        where: { user_id, is_archived: false, course: { semester: currentSemester } },
        include: { course: true }
    });
    const dictUserCourses = {};
    let upcomingExams = 0;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const activeSession = await prisma.academicSession.findFirst({
        where: { user_id },
        orderBy: { start_date: 'desc' }
    });

    if (activeSession && activeSession.end_date && today > activeSession.end_date) {
        return {
            id: 'ended',
            sessions: [],
            totalWeeksGenerated: 0,
            sessionsCreated: 0,
            notification: "Semester has ended. No study sessions scheduled. View Global History?"
        };
    }

    let latestExamDate = null;

    // === AUTO-COMPLETION OF PAST EXAMS ===
    for (const uc of userCourses) {
        if (uc.exam_date && !uc.is_completed) {
            const examDateOnly = new Date(uc.exam_date.getFullYear(), uc.exam_date.getMonth(), uc.exam_date.getDate());
            if (examDateOnly < todayMidnight) {
                await prisma.userCourse.update({
                    where: { id: uc.id },
                    data: { is_completed: true }
                });
                uc.is_completed = true;
            }
        }
        
        dictUserCourses[uc.course_id] = uc;

        if (uc.exam_date && !uc.is_completed) {
            const diffDays = (new Date(uc.exam_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays >= 0 && diffDays <= 7) upcomingExams++;

            if (!latestExamDate || new Date(uc.exam_date) > latestExamDate) {
                latestExamDate = new Date(uc.exam_date);
            }
        }
    }

    // Detect consecutive exams
    const activeExams = userCourses
        .filter(uc => uc.exam_date && !uc.is_completed)
        .map(uc => new Date(uc.exam_date.getFullYear(), uc.exam_date.getMonth(), uc.exam_date.getDate()).getTime())
        .sort((a, b) => a - b);

    let hasConsecutiveExams = false;
    for (let i = 0; i < activeExams.length - 1; i++) {
        if (activeExams[i + 1] - activeExams[i] === 86400000) { // exactly 1 day apart
            hasConsecutiveExams = true;
        }
    }

    let totalWeeks = 16;
    
    // Step 1: Always anchor to semester start
    const planStartDate = activeSession ? activeSession.start_date : today;
    
    // Step 2: Determine planning horizon
    let effectiveEndDate = null;
    if (latestExamDate) {
        // Case B: Exams exist
        effectiveEndDate = new Date(latestExamDate);
    } else if (activeSession && activeSession.end_date) {
        // Case A: End date explicitly provided (e.g., archived session)
        effectiveEndDate = new Date(activeSession.end_date);
    } else if (activeSession && !activeSession.end_date) {
        // Case C: Active session, infer end date from semester window
        const currentYear = new Date(activeSession.start_date).getFullYear();
        if (activeSession.semester === '1st Semester') {
            effectiveEndDate = new Date(currentYear, 5, 30); // June 30
        } else {
            effectiveEndDate = new Date(currentYear, 11, 31); // Dec 31
        }
    } else {
        effectiveEndDate = new Date(planStartDate);
        effectiveEndDate.setDate(effectiveEndDate.getDate() + (16 * 7)); // Fallback
    }

    effectiveEndDate.setHours(23, 59, 59, 999);
    
    const diffDays = Math.ceil((effectiveEndDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
    totalWeeks = Math.max(1, Math.ceil(diffDays / 7));

    if (totalWeeks > 24) totalWeeks = 24; // Sanity cap

    const isExamCluster = upcomingExams >= 3;

    const progressLogs = await prisma.progressLog.findMany({ where: { user_id, is_archived: false } });
    const dictProgressLogs = {};
    for (const p of progressLogs) {
        dictProgressLogs[p.user_course_id] = p;
    }

    const quizResults = await prisma.quizResult.findMany({ where: { user_id } });
    const dictQuizSum = {};
    const dictQuizCount = {};
    for (const q of quizResults) {
        let key = q.topic_name || q.course_id;
        if (!key) continue;
        if (!dictQuizSum[key]) dictQuizSum[key] = 0;
        if (!dictQuizCount[key]) dictQuizCount[key] = 0;
        dictQuizSum[key] += q.score_percentage / 100;
        dictQuizCount[key] += 1;
    }

    // Build prioritized topics (skip completed courses)
    let topicsWithPriority = [];
    let totalPriority = 0;

    for (const t of selectedTopics) {
        const uc = dictUserCourses[t.course_id];
        if (uc?.is_completed) continue;

        let topicQuizAvg = dictQuizCount[t.topic_name] ? dictQuizSum[t.topic_name] / dictQuizCount[t.topic_name] : null;
        if (topicQuizAvg === null && dictQuizCount[t.course_id]) {
            topicQuizAvg = dictQuizSum[t.course_id] / dictQuizCount[t.course_id];
        }

        const consistency = dictProgressLogs[uc.id] ? dictProgressLogs[uc.id].consistency_score : null;
        const riskFactor = calculateRiskFactor(topicQuizAvg, consistency);
        
        const units = t.course?.units || 3;
        const unitWeight = Math.min(units / 6, 1.0); // normalize assuming 6 is max

        const priority = calculateTopicPriority(t, uc, profile, riskFactor, unitWeight, isExamCluster);
        topicsWithPriority.push({ ...t, priority });
        totalPriority += priority;
    }

    for (let t of topicsWithPriority) {
        t.allocatedHours = totalPriority > 0
            ? (t.priority / totalPriority) * totalAvailableWeeklyHours
            : totalAvailableWeeklyHours / topicsWithPriority.length;
        if (t.allocatedHours < 0.25) t.allocatedHours = 0.25;
    }

    const userTopicIds = topicsWithPriority.map(t => t.id);

    // Delete future/current uncompleted sessions for recalculation to prevent duplicate pileups.
    // We preserve past uncompleted sessions (history) by using todayMidnight as the boundary.
    if (fullRecalculate) {
        const boundaryDate = new Date(todayMidnight);
        boundaryDate.setHours(0, 0, 0, 0);
        
        await prisma.studySession.deleteMany({
            where: {
                user_topic_id: { in: userTopicIds },
                completed: false,
                session_date: { gte: boundaryDate }
            }
        });
    }

    const studyPlan = await prisma.studyPlan.create({
        data: { user_id, week_start_date: planStartDate }
    });

    let sessionData = [];

    const addMinutes = (timeStr, mins) => {
        let [h, m] = timeStr.split(':').map(Number);
        m += mins;
        h += Math.floor(m / 60);
        m = m % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const getDiffMins = (startStr, endStr) => {
        const [sH, sM] = startStr.split(':').map(Number);
        const [eH, eM] = endStr.split(':').map(Number);
        return (eH * 60 + eM) - (sH * 60 + sM);
    };

    const getExactDateForDayName = (start, dayName) => {
        const daysMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
        const result = new Date(start);
        result.setDate(result.getDate() + (daysMap[dayName] || 0));
        result.setHours(12, 0, 0, 0); // Noon to avoid timezone shift
        return result;
    };

    const dayOfWeek = planStartDate.getDay(); 
    const diff = planStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStartAnchor = new Date(planStartDate);
    weekStartAnchor.setDate(diff);
    weekStartAnchor.setHours(0,0,0,0);

    for (let w = 0; w < totalWeeks; w++) {
        let currentWeekStart = new Date(weekStartAnchor);
        currentWeekStart.setDate(currentWeekStart.getDate() + (w * 7));

        let availableSlots = availabilities.map(a => {
            const exactDate = getExactDateForDayName(currentWeekStart, a.day_of_week);
            return {
                ...a,
                current_time: a.start_time,
                totalMins: getDiffMins(a.start_time, a.end_time),
                exactDate: exactDate
            };
        });

        // Punch holes for exams + handle post-exam preference
        let processedSlots = [];
        for (const slot of availableSlots) {
            let slotStrDate = slot.exactDate.toISOString().split('T')[0];
            let examsOnThisDay = userCourses.filter(uc => uc.exam_date && !uc.is_completed && uc.exam_date.toISOString().split('T')[0] === slotStrDate);
            
            if (examsOnThisDay.length > 0) {
                let slotStartMinutes = slot.current_time.split(':').map(Number)[0] * 60 + slot.current_time.split(':').map(Number)[1];
                let slotEndMinutes = slot.end_time.split(':').map(Number)[0] * 60 + slot.end_time.split(':').map(Number)[1];

                let finalSlotsForThisOriginalSlot = [{ start: slotStartMinutes, end: slotEndMinutes }];
                let isRestDayAfter = postExamPref === "REST";
                
                for (const exam of examsOnThisDay) {
                    if (!exam.exam_time) continue;
                    let examStartMins = exam.exam_time.split(':').map(Number)[0] * 60 + exam.exam_time.split(':').map(Number)[1];
                    let duration = exam.exam_duration || 180;
                    let examEndMins = examStartMins + duration;
                    
                    let newSlotsForThisOriginal = [];
                    for (const s of finalSlotsForThisOriginalSlot) {
                        if (examStartMins < s.end && examEndMins > s.start) {
                            if (s.start < examStartMins) {
                                newSlotsForThisOriginal.push({ start: s.start, end: examStartMins, isPreExamBlock: true, preExamCourseId: exam.course_id });
                            }
                            if (s.end > examEndMins) {
                                if (!isRestDayAfter) {
                                    newSlotsForThisOriginal.push({ start: examEndMins, end: s.end, afterExam: true });
                                }
                            }
                        } else {
                            if (s.end <= examStartMins) {
                                newSlotsForThisOriginal.push({ ...s, isPreExamBlock: true, preExamCourseId: exam.course_id });
                            } else {
                                newSlotsForThisOriginal.push(s);
                            }
                        }
                    }
                    finalSlotsForThisOriginalSlot = newSlotsForThisOriginal;
                }
                
                for (const s of finalSlotsForThisOriginalSlot) {
                    if (s.start >= s.end) continue;
                    const startStr = `${String(Math.floor(s.start/60)).padStart(2,'0')}:${String(s.start%60).padStart(2,'0')}`;
                    const endStr = `${String(Math.floor(s.end/60)).padStart(2,'0')}:${String(s.end%60).padStart(2,'0')}`;
                    processedSlots.push({
                         ...slot,
                         current_time: startStr,
                         start_time: startStr,
                         end_time: endStr,
                         afterExam: s.afterExam,
                         isPreExamBlock: s.isPreExamBlock,
                         preExamCourseId: s.preExamCourseId
                    });
                }
            } else {
                processedSlots.push(slot);
            }
        }
        
        availableSlots = processedSlots;

        let lightRevisionMinsUsedForDay = {};
        let preExamMinsUsedForDay = {};
        let morningRevisionUsedForDay = {};
        let dailyMinsUsedMap = {};
        let courseMorningAssigned = {};
        let morningRevisionCurrentTime = {};

        let latestExamDate = null;
        for (const uc of userCourses) {
            if (uc.exam_date && !uc.is_completed) {
                if (!latestExamDate || new Date(uc.exam_date) > latestExamDate) {
                    latestExamDate = new Date(uc.exam_date);
                }
            }
        }

        let weeklyTopics = topicsWithPriority.map(t => {
            let courseForT = userCourses.find(uc => uc.course_id === t.course_id);
            return {
                ...t,
                courseForT: courseForT,
                minsNeeded: Math.round(t.allocatedHours * 60)
            };
        });

        for (const slot of availableSlots) {
            const slotDateStr = slot.exactDate.toISOString().split('T')[0];

            // STRICT BOUNDARY: Only generate within semester and before effective end date
            // Do not generate new sessions in the past; preserve the history that was already recorded
            if ((effectiveEndDate && slot.exactDate > effectiveEndDate) || 
                (activeSession && slot.exactDate < activeSession.start_date) || 
                (slot.exactDate < todayMidnight)) {
                continue;
            }

            const examsOnThisDayCheck = userCourses.filter(uc => uc.exam_date && !uc.is_completed && uc.exam_date.toISOString().split('T')[0] === slotDateStr);
            const isExamDay = examsOnThisDayCheck.length > 0;
            const isFinalExamDay = latestExamDate && slotDateStr === latestExamDate.toISOString().split('T')[0];

            let nextExams = []; 
            let minDiff = Infinity; 
            for (const uc of userCourses) { 
                if (uc.exam_date && !uc.is_completed) { 
                    const diff = (new Date(uc.exam_date).getTime() - slot.exactDate.getTime()) / (1000 * 60 * 60 * 24); 
                    if (diff > 0 && diff <= minDiff) { 
                        if (diff < minDiff) {
                            minDiff = diff; 
                            nextExams = [uc];
                        } else {
                            nextExams.push(uc);
                        }
                    } 
                } 
            } 
            const nextDayHasExam = nextExams.length > 0 && minDiff <= 1;

            let maxMinutesToday = 180; 
            if (isFinalExamDay) { 
                maxMinutesToday = 60; 
            } else if (isExamDay && nextDayHasExam) {
                maxMinutesToday = 100;
            } else if (isExamDay) { 
                maxMinutesToday = 75; 
            } else if (nextDayHasExam) { 
                maxMinutesToday = 100; 
            } 

            let dailyMinsUsed = dailyMinsUsedMap[slotDateStr] || 0; 
            let slotRemainingMins = getDiffMins(slot.current_time, slot.end_time); 

            // Forced morning revision check before normal slot allocation
            if (allowMorningRevision && dailyMinsUsed < 45) {
                const userHasMorningSlot = availabilities.some(a => parseInt(a.start_time.split(':')[0]) < 12);
                if (!userHasMorningSlot) {
                    for (let t of weeklyTopics) {
                        let isExaminedTopicToday = isExamDay && examsOnThisDayCheck.some(uc => uc.course_id === t.course_id);
                        let isNextExamTopic = nextExams.some(nx => nx.course_id === t.course_id);
                        let qualifiesForMorning = (isExamDay && isExaminedTopicToday) || (!isExamDay && nextDayHasExam && isNextExamTopic);
                        let courseKey = `${slotDateStr}_${t.course_id}`;

                        if (qualifiesForMorning && !courseMorningAssigned[courseKey] && t.minsNeeded > 0) {
                            let ignoreMinsNeededForMorning = false;
                            let maxMorningChunk = 45;
                            if (isExamDay) {
                                maxMorningChunk = Math.floor(45 / Math.max(1, examsOnThisDayCheck.length));
                                ignoreMinsNeededForMorning = true;
                            }
                            
                            let possibleLength = Math.min(maxMorningChunk, maxMinutesToday - dailyMinsUsed);
                            if (!ignoreMinsNeededForMorning) possibleLength = Math.min(possibleLength, t.minsNeeded);
                            
                            if (possibleLength >= 15) { 
                                let startTime = morningRevisionCurrentTime[slotDateStr] || "07:00";
                                sessionData.push({ 
                                    study_plan_id: studyPlan.id, 
                                    user_topic_id: t.id, 
                                    session_date: slot.exactDate, 
                                    day_of_week: slot.day_of_week,
                                    start_time: startTime, 
                                    end_time: addMinutes(startTime, possibleLength), 
                                    duration_minutes: possibleLength, 
                                    allocated_hours: parseFloat((possibleLength / 60).toFixed(2)),
                                    break_after: true, 
                                    session_type: "REVISION", 
                                    is_morning: true 
                                }); 
                                dailyMinsUsed += possibleLength; 
                                t.minsNeeded -= possibleLength;
                                morningRevisionCurrentTime[slotDateStr] = addMinutes(startTime, possibleLength + 5);
                                courseMorningAssigned[courseKey] = true;
                            } 
                        }
                    }
                }
            }

            while (slotRemainingMins >= 20 && dailyMinsUsed < maxMinutesToday) { 
                let validTopics = weeklyTopics.filter(t => {
                    if (t.minsNeeded <= 0) return false;
                    let courseForT = t.courseForT;
                    
                    if (courseForT && courseForT.exam_date) {
                        const examDateOnly = new Date(courseForT.exam_date.getFullYear(), courseForT.exam_date.getMonth(), courseForT.exam_date.getDate());
                        if (slot.exactDate > examDateOnly) {
                            t.minsNeeded = 0; 
                            return false;
                        }
                    }

                    let isExaminedTopicToday = isExamDay && examsOnThisDayCheck.some(uc => uc.course_id === t.course_id);
                    let isNextExamTopic = nextExams.some(nx => nx.course_id === t.course_id);

                    if (isExamDay && !isExaminedTopicToday && !isNextExamTopic) return false; 
                    if (slot.isPreExamBlock && slot.preExamCourseId !== t.course_id) return false;
                    
                    let qualifiesForEvening = true;
                    if (isExamDay) {
                         if (isFinalExamDay) {
                             qualifiesForEvening = isExaminedTopicToday;
                         } else if (nextDayHasExam && !isFinalExamDay) {
                             qualifiesForEvening = isNextExamTopic;
                         } else {
                             qualifiesForEvening = isExaminedTopicToday;
                         }
                    }
                    if (!qualifiesForEvening) return false;
                    
                    return true;
                });

                if (validTopics.length === 0) break;

                // Interleaving Rule: No more than 2 consecutive sessions of the same course
                let lastCourseId = null;
                if (sessionData.length >= 2) {
                    let lastS1 = sessionData[sessionData.length - 1];
                    let lastS2 = sessionData[sessionData.length - 2];
                    
                    // Apply rule only within the same day for tighter interleaving
                    if (lastS1.session_date.getTime() === slot.exactDate.getTime() && 
                        lastS2.session_date.getTime() === slot.exactDate.getTime()) {
                        
                        let t1 = weeklyTopics.find(t => t.id === lastS1.user_topic_id);
                        let t2 = weeklyTopics.find(t => t.id === lastS2.user_topic_id);
                        
                        if (t1 && t2 && t1.course_id === t2.course_id) {
                            lastCourseId = t1.course_id;
                        }
                    }
                }

                let candidateTopics = validTopics.filter(t => t.course_id !== lastCourseId);
                let selectedTopic = null;
                
                if (candidateTopics.length > 0) {
                    candidateTopics.sort((a, b) => b.minsNeeded - a.minsNeeded);
                    selectedTopic = candidateTopics[0];
                } else {
                    // Fallback to avoid dead time if only 1 course is available
                    validTopics.sort((a, b) => b.minsNeeded - a.minsNeeded);
                    selectedTopic = validTopics[0];
                }

                let t = selectedTopic;
                let courseForT = t.courseForT;
                let isExaminedTopicToday = isExamDay && examsOnThisDayCheck.some(uc => uc.course_id === t.course_id);
                let isNextExamTopic = nextExams.some(nx => nx.course_id === t.course_id);
                let courseKey = `${slotDateStr}_${t.course_id}`;
                let maxAllowedSession = 50;

                // Check Morning Slot overlap
                const slotHour = parseInt(slot.current_time.split(':')[0]); 
                let isMorningSlot = slotHour < 12;
                let qualifiesForMorning = (isExamDay && isExaminedTopicToday) || (!isExamDay && nextDayHasExam && isNextExamTopic);
                
                let ignoreMinsNeededForMorning = false;
                if (allowMorningRevision && isMorningSlot && qualifiesForMorning && !courseMorningAssigned[courseKey]) {
                    if (isExamDay) {
                        maxAllowedSession = Math.floor(45 / Math.max(1, examsOnThisDayCheck.length));
                        ignoreMinsNeededForMorning = true;
                    } else {
                        maxAllowedSession = 45;
                    }
                    courseMorningAssigned[courseKey] = true;
                } else if (isExamDay && nextDayHasExam && nextExams.length > 1 && isNextExamTopic) {
                     maxAllowedSession = Math.max(20, Math.floor((maxMinutesToday - 45) / nextExams.length));
                }

                let forceEveningRevision = isNextExamTopic && nextDayHasExam;
                let effectiveMinsNeeded = forceEveningRevision || ignoreMinsNeededForMorning ? Math.max(t.minsNeeded, maxAllowedSession) : t.minsNeeded;

                let sessionLength = Math.min(maxAllowedSession, slotRemainingMins, maxMinutesToday - dailyMinsUsed, effectiveMinsNeeded); 
                if (sessionLength < 20) break; 
            
                let sessionType = (isFinalExamDay || isExamDay) ? "REVISION" : "LEARN"; 
                if (slot.isPreExamBlock || (!isExamDay && nextDayHasExam)) {
                    sessionType = "REVISION";
                } else if (sessionType === "LEARN") {
                    if (courseForT && courseForT.exam_date && !courseForT.is_completed) {
                        let diffEx = (new Date(courseForT.exam_date).getTime() - slot.exactDate.getTime()) / (1000 * 60 * 60 * 24);
                        if (diffEx >= 0 && diffEx <= 7) sessionType = "REVISION";
                    }
                }
            
                sessionData.push({ 
                    study_plan_id: studyPlan.id, 
                    user_topic_id: t.id, 
                    session_date: slot.exactDate, 
                    day_of_week: slot.day_of_week,
                    start_time: slot.current_time, 
                    end_time: addMinutes(slot.current_time, sessionLength), 
                    duration_minutes: sessionLength, 
                    allocated_hours: parseFloat((sessionLength / 60).toFixed(2)),
                    break_after: true, 
                    session_type: sessionType,
                    is_morning: isMorningSlot 
                }); 
                
                dailyMinsUsed += sessionLength; 
                t.minsNeeded -= sessionLength; 
                slot.current_time = addMinutes(slot.current_time, sessionLength + 5); 
                slotRemainingMins = getDiffMins(slot.current_time, slot.end_time); 
            } 
            
            dailyMinsUsedMap[slotDateStr] = dailyMinsUsed;
        }
    }

    if (sessionData.length > 0) {
        await prisma.studySession.createMany({ data: sessionData });
    }

    let notification = null;
    if (hasConsecutiveExams && postExamPref === "REST") {
        notification = "Consecutive exams detected. Light morning revision (max 45 mins) scheduled before the next exam. Rest of each exam day is kept free for recovery.";
    }

    return { 
        ...studyPlan,
        totalWeeksGenerated: totalWeeks,
        sessionsCreated: sessionData.length,
        notification
    };
}

async function markExamWritten(user_id, course_id) {
    const userCourse = await prisma.userCourse.findFirst({
        where: { user_id, course_id }
    });

    if (!userCourse) throw new Error("Course not found for user");

    await prisma.userCourse.update({
        where: { id: userCourse.id },
        data: { is_completed: true, completed_at: new Date() }
    });

    // Automatically regenerate the plan after marking exam as written
    return await generateStudyPlan(user_id);
}

module.exports = { generateStudyPlan, markExamWritten };
