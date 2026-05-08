const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAcademicStatus = async (req, res) => {
    try {
        const user_id = req.user.id;

        // Find all unarchived user courses
        const activeCourses = await prisma.userCourse.findMany({
            where: {
                user_id,
                is_archived: false,
                exam_date: {
                    not: null
                }
            }
        });

        if (activeCourses.length === 0) {
            // No exams scheduled or all archived
            return res.json({
                isComplete: false,
                canProgress: false
            });
        }

        // Find max exam date
        const maxExamDate = activeCourses.reduce((latest, course) => {
            return course.exam_date > latest ? course.exam_date : latest;
        }, activeCourses[0].exam_date);

        const currentDate = new Date();

        // If today is after the last exam date
        if (currentDate > maxExamDate) {
            return res.json({
                isComplete: true,
                canProgress: true
            });
        }

        return res.json({
            isComplete: false,
            canProgress: false
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error checking academic status' });
    }
};

const progressSemester = async (req, res) => {
    try {
        const user_id = req.user.id;

        // Get current profile
        const profile = await prisma.academicProfile.findUnique({
            where: { user_id }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Academic profile not found' });
        }

        // Calculate next semester and level
        let currentSemesterInt = profile.semester; // 1 or 2
        let nextSemesterInt;
        let nextLevel = profile.level;

        if (currentSemesterInt === 1) {
            nextSemesterInt = 2;
        } else {
            nextSemesterInt = 1;
            nextLevel += 100;
        }

        const nextSemesterStr = nextSemesterInt === 1 ? '1st Semester' : '2nd Semester';

        // Find current open academic session
        const currentSession = await prisma.academicSession.findFirst({
            where: {
                user_id,
                end_date: null
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // Determine start date based on the next semester window
        const currentYear = new Date().getFullYear();
        let startDate;
        if (nextSemesterInt === 1) {
            startDate = new Date(currentYear, 0, 1); // Jan 1
        } else {
            startDate = new Date(currentYear, 6, 1); // Jul 1
        }

        // Perform all updates in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Archive current session
            if (currentSession) {
                await tx.academicSession.update({
                    where: { id: currentSession.id },
                    data: {
                        end_date: new Date(),
                        is_archived: true
                    }
                });
            }

            // 2. Create new session
            const newSession = await tx.academicSession.create({
                data: {
                    user_id,
                    semester: nextSemesterStr,
                    level: nextLevel,
                    start_date: startDate
                }
            });

            // 3. Update academic profile
            await tx.academicProfile.update({
                where: { user_id },
                data: {
                    semester: nextSemesterInt,
                    level: nextLevel
                }
            });

            // 3.5 Reset Onboarding Stage
            await tx.user.update({
                where: { id: user_id },
                data: { onboarding_stage: 'COURSES' }
            });

            // 4. Archive models instead of deleting
            await tx.userCourse.updateMany({
                where: { user_id, is_archived: false },
                data: { is_archived: true }
            });

            await tx.userTopic.updateMany({
                where: { user_id, is_archived: false },
                data: { is_archived: true }
            });

            await tx.studyPlan.updateMany({
                where: { user_id, is_archived: false },
                data: { is_archived: true }
            });

            // Archive StudySessions related to the user's StudyPlans
            const userStudyPlans = await tx.studyPlan.findMany({
                where: { user_id } 
            });
            const planIds = userStudyPlans.map(p => p.id);
            if (planIds.length > 0) {
                await tx.studySession.updateMany({
                    where: { study_plan_id: { in: planIds }, is_archived: false },
                    data: { is_archived: true }
                });
            }

            await tx.progressLog.updateMany({
                where: { user_id, is_archived: false },
                data: { is_archived: true }
            });

            await tx.mistakeLog.updateMany({
                where: { user_id, is_archived: false },
                data: { is_archived: true }
            });
        });

        res.json({ message: 'Successfully progressed to next semester' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during semester progression' });
    }
};

module.exports = {
    getAcademicStatus,
    progressSemester
};
