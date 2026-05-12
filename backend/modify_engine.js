const fs = require('fs');

let content = fs.readFileSync('c:/Users/runsa/OneDrive/Documents/my_fyp/nuero_plan_app/backend/src/services/allocationEngine.js', 'utf8');

// Replace variables at the top
content = content.replace(
    'const postExamPref = userObj.post_exam_preference || "REST";\n    const allowMorningRevision = userObj.allow_morning_revision || false;',
    'const studyAfterExamMode = userObj.post_exam_preference || "OFF";\n    const allowPreExamRevision = userObj.allow_morning_revision || false;\n    const preferredFocusWindow = userObj.preferred_focus_window || "ANY";'
);

// Replace the utility functions
const utils = `
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
`;

content = content.replace('function getDayMinutes', utils + '\nfunction getDayMinutes');

const parts = content.split('        // Punch holes for exams + handle post-exam preference');
const header = parts[0];
const footerParts = parts[1].split('    if (sessionData.length > 0) {');
// we need to discard what is in parts[1] up to `if (sessionData.length > 0) {`
const footer = '    if (sessionData.length > 0) {' + footerParts[1];

const new_loop_body = `
        // Punch holes for exams + handle post-exam preference
        let processedSlots = [];
        for (const slot of availableSlots) {
            let slotStrDate = slot.exactDate.toISOString().split('T')[0];
            let examsOnThisDay = userCourses.filter(uc => uc.exam_date && !uc.is_completed && uc.exam_date.toISOString().split('T')[0] === slotStrDate);
            
            let slotStartMinutes = slot.current_time.split(':').map(Number)[0] * 60 + slot.current_time.split(':').map(Number)[1];
            let slotEndMinutes = slot.end_time.split(':').map(Number)[0] * 60 + slot.end_time.split(':').map(Number)[1];
            
            if (examsOnThisDay.length > 0) {
                // Apply LIGHT mode consistently if hasConsecutiveExams
                let currentMode = studyAfterExamMode;
                if (currentMode === "REST") currentMode = "OFF";
                if (currentMode === "LIGHT_REVISION") currentMode = "LIGHT";
                if (currentMode === "FULL_STUDY") currentMode = "FULL";
                
                if (hasConsecutiveExams) currentMode = "LIGHT";
                
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
                    
                    const startStr = \`\${String(Math.floor(seg.start/60)).padStart(2,'0')}:\${String(seg.start%60).padStart(2,'0')}\`;
                    const endStr = \`\${String(Math.floor(seg.end/60)).padStart(2,'0')}:\${String(seg.end%60).padStart(2,'0')}\`;
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

            let currentMode = studyAfterExamMode;
            if (currentMode === "REST") currentMode = "OFF";
            if (currentMode === "LIGHT_REVISION") currentMode = "LIGHT";
            if (currentMode === "FULL_STUDY") currentMode = "FULL";
            if (hasConsecutiveExams) currentMode = "LIGHT";

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
            
                const startStr = \`\${String(Math.floor(currentSlotStart/60)).padStart(2,'0')}:\${String(currentSlotStart%60).padStart(2,'0')}\`;
                let sessionEndMins = currentSlotStart + sessionLength;
                const endStr = \`\${String(Math.floor(sessionEndMins/60)).padStart(2,'0')}:\${String(sessionEndMins%60).padStart(2,'0')}\`;

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
`;

fs.writeFileSync('c:/Users/runsa/OneDrive/Documents/my_fyp/nuero_plan_app/backend/scratch_allocationEngine.js', header + new_loop_body + footer);
console.log("Script completed successfully.");
