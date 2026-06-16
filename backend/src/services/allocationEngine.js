const { calculateTopicPriority } = require('./priorityEngine');
const { calculateRiskFactor } = require('./riskEngine');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


function subtractIntervals(availabilitySlots, examSlots) {
    let result = [];
    for (let slot of availabilitySlots) {
        let currentSegments = [slot];
        
        for (let exam of examSlots) {
            let nextSegments = [];
            for (let seg of currentSegments) {
                if (exam.start < seg.end && exam.end > seg.start) {
                    if (seg.start < exam.start) {
                        nextSegments.push({ start: seg.start, end: exam.start, isPreExamBlock: true, preExamCourseId: exam.courseId });
                    }
                    if (seg.end > exam.end) {
                        nextSegments.push({ start: exam.end, end: seg.end, isPostExamBlock: true });
                    }
                } else {
                    if (seg.end <= exam.start) {
                        nextSegments.push({ ...seg, isPreExamBlock: true, preExamCourseId: exam.courseId });
                    } else if (seg.start >= exam.end) {
                        nextSegments.push({ ...seg, isPostExamBlock: true });
                    } else {
                        nextSegments.push(seg);
                    }
                }
            }
            currentSegments = nextSegments;
        }
        result.push(...currentSegments);
    }
    return result;
}

function scoreSlot(slot, preference) {
    const hour = Math.floor(slot.start / 60);
    if (preference === "early" && hour < 12) return 2;
    if (preference === "late" && hour >= 17) return 2;
    if (preference === "mid" && hour >= 12 && hour < 17) return 2;
    return 1;
}

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
    
    const studyAfterExamMode = userObj.post_exam_preference || "OFF";
    const allowPreExamRevision = userObj.allow_morning_revision || false;
    const preferredFocusWindow = userObj.preferred_focus_window || "ANY";
    const currentSemester = profile.semester;

    const userCourses = await prisma.userCourse.findMany({ 
        where: { user_id, is_archived: false },
        include: { course: true }
    });

    let selectedTopics = await prisma.userTopic.findMany({
        where: { 
            user_id, 
            is_selected: true,
            is_archived: false
        },
        include: { course: true }
    });

    if (selectedTopics.length === 0) {
        if (userCourses.length === 0) {
             throw new Error("No active courses found. Please add courses first.");
        }
        
        // Auto-seed missing topics for legacy users or skipped topic selections
        const topicsToSave = userCourses.map(c => ({
            user_id: user_id,
            course_id: c.course_id,
            topic_name: 'General Study',
            mastery_level: 0,
            is_selected: true
        }));
        
        await prisma.userTopic.createMany({ data: topicsToSave });
        
        selectedTopics = await prisma.userTopic.findMany({
            where: { 
                user_id, 
                is_selected: true,
                is_archived: false
            },
            include: { course: true }
        });
    }

    if (selectedTopics.length === 0) throw new Error("Failed to initialize study topics");

    const availabilities = await prisma.studyAvailability.findMany({ 
        where: { user_id }
    });
    
    // Ensure chronological order of days: Mon -> Sun
    const daysOrder = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
    availabilities.sort((a, b) => daysOrder[a.day_of_week] - daysOrder[b.day_of_week]);
    if (availabilities.length === 0) throw new Error("No study availability set");

    const totalMinutes = getDayMinutes(availabilities);
    const totalAvailableWeeklyHours = totalMinutes / 60;
    if (totalAvailableWeeklyHours <= 0) throw new Error("Available hours must be greater than 0");
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

    // Delete uncompleted sessions starting from planStartDate for recalculation to prevent duplicate pileups.
    // We preserve past completed sessions by filtering on completed: false.
    if (fullRecalculate) {
        const boundaryDate = new Date(planStartDate);
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
            
            let slotStartMinutes = slot.current_time.split(':').map(Number)[0] * 60 + slot.current_time.split(':').map(Number)[1];
            let slotEndMinutes = slot.end_time.split(':').map(Number)[0] * 60 + slot.end_time.split(':').map(Number)[1];
            
            if (examsOnThisDay.length > 0) {
                // Apply LIGHT mode consistently if there's an exam tomorrow
                let currentMode = studyAfterExamMode;
                if (currentMode === "REST") currentMode = "OFF";
                if (currentMode === "LIGHT_REVISION") currentMode = "LIGHT";
                if (currentMode === "FULL_STUDY") currentMode = "FULL";
                
                let localNextDayHasExam = false;
                for (const uc of userCourses) {
                     if (uc.exam_date && !uc.is_completed) {
                         const diff = (new Date(uc.exam_date).getTime() - slot.exactDate.getTime()) / (1000 * 60 * 60 * 24);
                         if (diff > 0 && diff <= 1) localNextDayHasExam = true;
                     }
                }
                if (localNextDayHasExam) currentMode = "LIGHT";
                
                if (currentMode === "OFF") {
                    // Do not generate any sessions for that day
                    continue;
                }
                
                let examSlots = [];
                for (const exam of examsOnThisDay) {
                    if (!exam.exam_time) continue;
                    let examStartMins = exam.exam_time.split(':').map(Number)[0] * 60 + exam.exam_time.split(':').map(Number)[1];
                    let duration = exam.exam_duration || 180;
                    examSlots.push({ start: examStartMins, end: examStartMins + duration, courseId: exam.course_id });
                }
                
                let validSegments = subtractIntervals([{ start: slotStartMinutes, end: slotEndMinutes }], examSlots);
                
                for (let seg of validSegments) {
                    // Discard slots < 30 minutes
                    if (seg.end - seg.start < 30) continue;
                    
                    if (currentMode === "LIGHT") {
                        if (seg.isPreExamBlock && !allowPreExamRevision) continue;
                        // For light, we prioritize preExamSlots if allowPreExamRevision, else postExamSlots. This prioritization happens during slot selection.
                    } else if (currentMode === "FULL") {
                        if (seg.isPreExamBlock && !allowPreExamRevision) continue;
                    }
                    
                    const startStr = `${String(Math.floor(seg.start/60)).padStart(2,'0')}:${String(seg.start%60).padStart(2,'0')}`;
                    const endStr = `${String(Math.floor(seg.end/60)).padStart(2,'0')}:${String(seg.end%60).padStart(2,'0')}`;
                    processedSlots.push({
                         ...slot,
                         current_time: startStr,
                         start_time: startStr,
                         end_time: endStr,
                         isPreExamBlock: seg.isPreExamBlock,
                         isPostExamBlock: seg.isPostExamBlock,
                         preExamCourseId: seg.preExamCourseId,
                         startMins: seg.start,
                         endMins: seg.end
                    });
                }
            } else {
                processedSlots.push({
                     ...slot,
                     startMins: slotStartMinutes,
                     endMins: slotEndMinutes
                });
            }
        }
        
        availableSlots = processedSlots;

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

        // Generate Valid Study Windows and allocate
        let dailyMinsUsedMap = {};
        
        for (let slot of availableSlots) {
            const slotDateStr = slot.exactDate.toISOString().split('T')[0];

            if ((effectiveEndDate && slot.exactDate > effectiveEndDate) || 
                (activeSession && slot.exactDate < activeSession.start_date)) {
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

            let currentMode = studyAfterExamMode;
            if (currentMode === "REST") currentMode = "OFF";
            if (currentMode === "LIGHT_REVISION") currentMode = "LIGHT";
            if (currentMode === "FULL_STUDY") currentMode = "FULL";
            if (nextDayHasExam) currentMode = "LIGHT";

            let maxMinutesToday = 180; 
            if (isExamDay) {
                if (currentMode === "LIGHT") maxMinutesToday = 90; // max 1.5 hours
                else if (currentMode === "FULL") maxMinutesToday = 180;
            }

            let dailyMinsUsed = dailyMinsUsedMap[slotDateStr] || 0; 
            let slotRemainingMins = slot.endMins - slot.startMins; 
            let currentSlotStart = slot.startMins;

            while (slotRemainingMins >= 30 && dailyMinsUsed < maxMinutesToday) { 
                let validTopics = weeklyTopics.filter(t => {
                    if (t.minsNeeded <= 0) return false;
                    let courseForT = t.courseForT;
                    
                    if (courseForT && courseForT.exam_date) {
                        const slotDateStr = slot.exactDate.toISOString().split('T')[0];
                        const examDateStr = courseForT.exam_date.toISOString().split('T')[0];
                        if (slotDateStr > examDateStr) {
                            t.minsNeeded = 0; 
                            return false;
                        }
                    }

                    let isExaminedTopicToday = isExamDay && examsOnThisDayCheck.some(uc => uc.course_id === t.course_id);
                    let isNextExamTopic = nextExams.some(nx => nx.course_id === t.course_id);

                    if (slot.isPreExamBlock && slot.preExamCourseId !== t.course_id) return false;
                    
                    if (isExamDay) {
                        if (slot.isPreExamBlock) {
                            if (!isExaminedTopicToday) return false;
                        } else {
                            if (isFinalExamDay) return false;
                            if (!isNextExamTopic) return false;
                        }
                    }
                    
                    return true;
                });

                if (validTopics.length === 0) break;

                // Sort by score if preferredFocusWindow is set
                let sortedByScore = validTopics.map(t => ({
                    topic: t,
                    score: scoreSlot({ start: currentSlotStart }, preferredFocusWindow)
                })).sort((a, b) => b.score - a.score);
                
                // Then interleave
                let lastCourseId = null;
                if (sessionData.length >= 1) {
                    let lastS1 = sessionData[sessionData.length - 1];
                    if (lastS1.session_date.getTime() === slot.exactDate.getTime()) {
                        let t1 = weeklyTopics.find(t => t.id === lastS1.user_topic_id);
                        if (t1) {
                            lastCourseId = t1.course_id;
                        }
                    }
                }

                let candidateTopics = sortedByScore.filter(t => t.topic.course_id !== lastCourseId);
                let selectedTopic = null;
                
                if (candidateTopics.length > 0) {
                    candidateTopics.sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;
                        return b.topic.minsNeeded - a.topic.minsNeeded;
                    });
                    selectedTopic = candidateTopics[0].topic;
                } else {
                    sortedByScore.sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;
                        return b.topic.minsNeeded - a.topic.minsNeeded;
                    });
                    selectedTopic = sortedByScore[0].topic;
                }

                let t = selectedTopic;
                let courseForT = t.courseForT;
                let maxAllowedSession = 50;

                let sessionLength = Math.min(maxAllowedSession, slotRemainingMins, maxMinutesToday - dailyMinsUsed, t.minsNeeded); 
                if (sessionLength < 30) break; 
            
                let sessionType = (isFinalExamDay || isExamDay || slot.isPreExamBlock || nextDayHasExam) ? "REVISION" : "LEARN"; 
                if (sessionType === "LEARN") {
                    if (courseForT && courseForT.exam_date && !courseForT.is_completed) {
                        let diffEx = (new Date(courseForT.exam_date).getTime() - slot.exactDate.getTime()) / (1000 * 60 * 60 * 24);
                        if (diffEx >= 0 && diffEx <= 7) sessionType = "REVISION";
                    }
                }
            
                const startStr = `${String(Math.floor(currentSlotStart/60)).padStart(2,'0')}:${String(currentSlotStart%60).padStart(2,'0')}`;
                let sessionEndMins = currentSlotStart + sessionLength;
                const endStr = `${String(Math.floor(sessionEndMins/60)).padStart(2,'0')}:${String(sessionEndMins%60).padStart(2,'0')}`;

                sessionData.push({ 
                    study_plan_id: studyPlan.id, 
                    user_topic_id: t.id, 
                    session_date: slot.exactDate, 
                    day_of_week: slot.day_of_week,
                    start_time: startStr, 
                    end_time: endStr, 
                    duration_minutes: sessionLength, 
                    allocated_hours: parseFloat((sessionLength / 60).toFixed(2)),
                    break_after: true, 
                    session_type: sessionType,
                    is_morning: currentSlotStart < 12 * 60 
                }); 
                
                dailyMinsUsed += sessionLength; 
                t.minsNeeded -= sessionLength; 
                currentSlotStart = sessionEndMins + 5; // 5 min cognitive break
                slotRemainingMins = slot.endMins - currentSlotStart; 
            } 
            
            dailyMinsUsedMap[slotDateStr] = dailyMinsUsed;
        }
    }
    if (sessionData.length > 0) {
        await prisma.studySession.createMany({ data: sessionData });
    }

    let notification = null;
    if (hasConsecutiveExams && (studyAfterExamMode === "OFF" || studyAfterExamMode === "REST")) {
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
