const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
    try {
        const user_id = req.user.id;

        // Fetch user for streak info
        const user = await prisma.user.findUnique({ where: { id: user_id } });
        let currentStreak = user.streak_count;

        // Dynamic Streak Calculation replacing manual database accumulator.
        // Supports retroactive completions seamlessly by walking backwards from today.
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const currentPlan = await prisma.studyPlan.findFirst({
            where: { user_id },
            orderBy: { generated_date: 'desc' }
        });

        // 1. Fetch all historical sessions to compute the streak dynamically
        let allPastSessions = await prisma.studySession.findMany({
            where: {
                topic: { user_id },
                session_date: { lte: new Date() }
            },
            include: { studyPlan: true }
        });

        // 2. Deduplicate legacy sessions
        const dateStrMaxPlanDate = new Map();
        for (const s of allPastSessions) {
            if (!s.session_date) continue;
            const dStr = new Date(s.session_date).toISOString().split('T')[0];
            const cMax = dateStrMaxPlanDate.get(dStr) || new Date(0);
            const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
            if (sPlanDate > cMax) {
                dateStrMaxPlanDate.set(dStr, sPlanDate);
            }
        }

        allPastSessions = allPastSessions.filter(s => {
            if (!s.session_date) return false;
            if (currentPlan && s.study_plan_id === currentPlan.id) return true;
            if (s.completed) return true;
            const dStr = new Date(s.session_date).toISOString().split('T')[0];
            const maxPlanDate = dateStrMaxPlanDate.get(dStr);
            const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
            if (sPlanDate.getTime() === maxPlanDate?.getTime()) return true;
            return false;
        });

        const sessionsByDay = new Map();
        for (const s of allPastSessions) {
            const dStr = new Date(s.session_date).toISOString().split('T')[0];
            if (!sessionsByDay.has(dStr)) sessionsByDay.set(dStr, []);
            sessionsByDay.get(dStr).push(s);
        }

        let calculatedStreak = 0;
        let currentDateWalker = new Date(todayStart);

        // 3. Evaluate Today
        const yToday = currentDateWalker.getFullYear();
        const mToday = String(currentDateWalker.getMonth() + 1).padStart(2, '0');
        const dToday = String(currentDateWalker.getDate()).padStart(2, '0');
        const todayStr = `${yToday}-${mToday}-${dToday}`;
        
        const todayS = sessionsByDay.get(todayStr);
        if (todayS && todayS.length > 0) {
            const allCompleted = todayS.every(s => s.completed);
            if (allCompleted) calculatedStreak++;
        }

        currentDateWalker.setDate(currentDateWalker.getDate() - 1); // step to yesterday

        // 4. Retrospective Traversal
        while (true) {
            const yW = currentDateWalker.getFullYear();
            const mW = String(currentDateWalker.getMonth() + 1).padStart(2, '0');
            const dW = String(currentDateWalker.getDate()).padStart(2, '0');
            const dStr = `${yW}-${mW}-${dW}`;

            const daySessions = sessionsByDay.get(dStr);

            if (!daySessions || daySessions.length === 0) {
                // Rest day: jump over it without breaking streak
            } else {
                const allCompleted = daySessions.every(s => s.completed);
                if (allCompleted) {
                    calculatedStreak++;
                } else {
                    // First uncompleted scheduled day breaks the backwards unbroken chain
                    break;
                }
            }

            currentDateWalker.setDate(currentDateWalker.getDate() - 1);
            
            // Circuit breaker limit search to last 365 days
            const diffDays = Math.floor((todayStart - currentDateWalker) / (1000 * 60 * 60 * 24));
            if (diffDays > 365) break; 
        }

        if (calculatedStreak !== currentStreak) {
            await prisma.user.update({
                where: { id: user_id },
                data: { streak_count: calculatedStreak }
            });
            currentStreak = calculatedStreak;
        }

        // 1. Total Courses
        const courses = await prisma.userCourse.findMany({ 
            where: { user_id, is_completed: false },
            include: { course: true }
        });
        const totalCourses = courses.length;

        // 2. High Risk Courses
        const highRiskCourses = courses.filter(c => c.course.difficulty >= 4).length;

        // 3. Next Exam Countdown
        let nextExam = null;
        let daysToNextExam = null;
        const futureExams = courses.filter(c => c.exam_date && new Date(c.exam_date) > new Date());
        if (futureExams.length > 0) {
            nextExam = futureExams.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0];
            const diffTime = Math.abs(new Date(nextExam.exam_date) - new Date());
            daysToNextExam = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // 4. Study Progress per course (from ProgressLog)
        const progressLogs = await prisma.progressLog.findMany({
            where: { user_id },
            include: { userCourse: { include: { course: true } } }
        });

        // 5. Dynamic Neuro Insight Data-Driven Generation
        const profile = await prisma.academicProfile.findUnique({ where: { user_id } });
        let aiInsight = "The engine is actively balancing your study week based on dynamic weightings. Keep up the consistency.";

        // Setup Exam Cluster Detection
        const todayNum = new Date().getTime();
        let upcomingExamsCount = 0;
        for (const c of courses) {
            if (c.exam_date) {
                const diffDays = (new Date(c.exam_date).getTime() - todayNum) / (1000 * 60 * 60 * 24);
                if (diffDays >= 0 && diffDays <= 7) upcomingExamsCount++;
            }
        }
        const isExamCluster = upcomingExamsCount >= 3;

        if (profile) {
            if (isExamCluster) {
                aiInsight = "Exam Cluster Detected — Intensified Preparation Mode Activated. Temporary weight multipliers have been applied.";
            } else if (highRiskCourses >= 2) {
                aiInsight = `${highRiskCourses} courses are flagged high-risk due to difficulty scaling and proximity. Over-allocation is active.`;
            } else if (futureExams.length > 0 && daysToNextExam < 14) {
                aiInsight = `Exam in ${nextExam.course.code} is approaching in ${daysToNextExam} days. Priority weight has been increased accordingly.`;
            } else if (profile.current_cgpa < 3.5 && profile.academic_goal === 'First Class') {
                aiInsight = "To reach First Class range, additional emphasis has been placed on your core courses.";
            } else if (profile.current_cgpa < 3.0 && profile.academic_goal === 'Second Class Upper') {
                aiInsight = "To reach Second Class Upper range, additional emphasis has been placed on your core courses.";
            }
        }

        res.json({
            streak_count: currentStreak,
            totalCourses,
            highRiskCourses,
            nextExam: nextExam ? { title: nextExam.course.title, days: daysToNextExam } : null,
            progressLogs,
            aiInsight,
            profile // optionally send profile to frontend
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching dashboard' });
    }
};

const markSessionComplete = async (req, res) => {
    try {
        const { session_id, current_date } = req.body;

        if (!current_date) {
            return res.status(400).json({ message: 'Missing current_date in request' });
        }

        const sessionDateObj = new Date(current_date);
        sessionDateObj.setUTCHours(12, 0, 0, 0);

        const sessionToUpdate = await prisma.studySession.findUnique({
            where: { id: session_id },
            include: { topic: { include: { course: true } } }
        });
        
        if (!sessionToUpdate) {
            return res.status(400).json({ message: 'Session not found.' });
        }

        const newStatus = !sessionToUpdate.completed;

        await prisma.studySession.update({
            where: { id: session_id },
            data: { completed: newStatus }
        });

        // Resolve userCourseId from the generic course_id and user_id to update ProgressLog correctly
        const userCourse = await prisma.userCourse.findFirst({
            where: { user_id: req.user.id, course_id: sessionToUpdate.topic.course_id }
        });

        if (userCourse) {
            let log = await prisma.progressLog.findFirst({
                where: { user_id: req.user.id, user_course_id: userCourse.id }
            });

            if (log) {
                const hourChange = newStatus ? sessionToUpdate.allocated_hours : -sessionToUpdate.allocated_hours;
                await prisma.progressLog.update({
                    where: { id: log.id },
                    data: { study_hours_logged: Math.max(0, log.study_hours_logged + hourChange) }
                });
            } else if (newStatus) {
                await prisma.progressLog.create({
                    data: {
                        user_id: req.user.id,
                        user_course_id: userCourse.id,
                        study_hours_logged: sessionToUpdate.allocated_hours,
                        consistency_score: 1.0 // fresh start
                    }
                });
            }
        }

        let streak_incremented = false;

        const todaysSessions = await prisma.studySession.findMany({
             where: { 
                 study_plan_id: sessionToUpdate.study_plan_id,
                 session_date: sessionToUpdate.session_date 
             }
        });

        if (todaysSessions.length > 0) {
            const totalCount = todaysSessions.length;
            const completedCount = todaysSessions.filter(s => s.completed).length;

            const userObj = await prisma.user.findUnique({ where: { id: req.user.id } });
            
            // Format both dates as YYYY-MM-DD strings for comparison
            const currentSessionDateStr = sessionToUpdate.session_date ? new Date(sessionToUpdate.session_date).toISOString().split('T')[0] : '';
            const lastUpdateStr = userObj.streak_last_updated ? new Date(userObj.streak_last_updated).toISOString().split('T')[0] : '';

            if (newStatus && totalCount === completedCount) {
                if (lastUpdateStr !== currentSessionDateStr && currentSessionDateStr !== '') {
                    await prisma.user.update({
                        where: { id: req.user.id },
                        data: { 
                            streak_count: { increment: 1 },
                            streak_last_updated: sessionToUpdate.session_date
                        }
                    });
                    streak_incremented = true;
                }
            } else if (!newStatus && (completedCount === totalCount - 1)) {
                // If it WAS fully complete and now it's not
                if (lastUpdateStr === currentSessionDateStr && currentSessionDateStr !== '') {
                    // Revert the streak for this day
                    
                    // A fallback date (e.g. yesterday relative to the session) so we don't accidentally prevent tomorrow from incrementing if left alone
                    const fallbackDate = new Date(sessionToUpdate.session_date);
                    fallbackDate.setDate(fallbackDate.getDate() - 1);

                    await prisma.user.update({
                        where: { id: req.user.id },
                        data: { 
                            streak_count: Math.max(0, userObj.streak_count - 1),
                            streak_last_updated: fallbackDate
                        }
                    });
                    // Decremented, so streak_incremented remains false
                }
            }
        }

        res.json({ message: 'Session updated', session: sessionToUpdate, streak_incremented });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error marking session' });
    }
}

const getGlobalHistory = async (req, res) => {
    try {
        const user_id = req.user.id;
        
        const plan = await prisma.studyPlan.findFirst({
            where: { user_id },
            orderBy: { generated_date: 'desc' }
        });

        const academicSessions = await prisma.academicSession.findMany({
            where: { user_id },
            orderBy: { start_date: 'desc' }
        });

        const timeline = [];
        for (const session of academicSessions) {
            let studySessions = await prisma.studySession.findMany({
                where: {
                    topic: { user_id },
                    session_date: {
                        gte: session.start_date,
                        lte: session.end_date
                    }
                },
                include: { 
                    topic: { include: { course: true } },
                    studyPlan: true
                }
            });

            const dateStrMaxPlanDate = new Map();

            for (const s of studySessions) {
                if (!s.session_date) continue;
                const dateStr = new Date(s.session_date).toISOString().split('T')[0];
                
                const currentMax = dateStrMaxPlanDate.get(dateStr) || new Date(0);
                const sessionPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
                
                if (sessionPlanDate > currentMax) {
                    dateStrMaxPlanDate.set(dateStr, sessionPlanDate);
                }
            }

            studySessions = studySessions.filter(s => {
                if (!s.session_date) return false;
                if (plan && s.study_plan_id === plan.id) return true;
                if (s.completed) return true;

                const dateStr = new Date(s.session_date).toISOString().split('T')[0];
                const maxPlanDate = dateStrMaxPlanDate.get(dateStr);
                const sessionPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);

                if (sessionPlanDate.getTime() === maxPlanDate?.getTime()) {
                    return true;
                }

                return false;
            });

            const completedSessions = studySessions.filter(s => s.completed);
            const totalHours = completedSessions.reduce((sum, s) => sum + s.allocated_hours, 0);

            const coursesStudied = new Set();
            completedSessions.forEach(s => {
                if (s.topic && s.topic.course) {
                    coursesStudied.add(s.topic.course.code);
                }
            });

            timeline.push({
                session_name: session.name,
                start_date: session.start_date,
                end_date: session.end_date,
                total_hours: totalHours,
                courses_studied: Array.from(coursesStudied).length,
                completed_sessions_count: completedSessions.length,
                total_sessions_count: studySessions.length
            });
        }

        res.json({ timeline });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching global history' });
    }
};

module.exports = { getDashboardStats, markSessionComplete, getGlobalHistory };
