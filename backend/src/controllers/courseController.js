const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getCurriculum = async (req, res) => {
    try {
        const { program, level, semester } = req.query;

        let whereClause = {};
        // Match program by name if passed, requiring join
        if (program) whereClause.program = { name: program };
        if (level) whereClause.level = parseInt(level);
        if (semester) whereClause.semester = parseInt(semester);

        const curriculum = await prisma.course.findMany({
            where: whereClause,
            include: {
                program: true,
                courseTopics: true
            },
            orderBy: [
                { level: 'asc' },
                { semester: 'asc' },
                { code: 'asc' }
            ]
        });

        res.json(curriculum);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching curriculum' });
    }
};

const saveUserCourses = async (req, res) => {
    try {
        const { courses } = req.body; // Array of course objects
        const user_id = req.user.id;

        // Optional: clear existing courses first or handle updates
        // For simplicity, we just add new ones here, or you could delete all and recreate
        await prisma.userCourse.deleteMany({
            where: { user_id }
        });

        const savedCourses = await prisma.$transaction(
            courses.map(c => 
                prisma.userCourse.create({
                    data: {
                        user_id,
                        course_id: c.id, 
                        is_selected: true
                    }
                })
            )
        );

        // Advance Onboarding Stage to TOPICS
        await prisma.user.update({
            where: { id: user_id },
            data: { onboarding_stage: 'TOPICS' }
        });

        res.status(201).json({ message: 'Courses saved successfully', count: savedCourses.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error saving courses' });
    }
};

const getUserCourses = async (req, res) => {
    try {
        const courses = await prisma.userCourse.findMany({
            where: { user_id: req.user.id, is_archived: false },
            include: { course: { include: { courseTopics: true } } }
        });
        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching user courses' });
    }
};

const updateUserCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { difficulty, exam_date } = req.body;

        // Verify course belongs to user
        const course = await prisma.userCourse.findFirst({
            where: { id, user_id: req.user.id, is_archived: false }
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const updatedCourse = await prisma.userCourse.update({
            where: { id },
            data: {
                exam_date: exam_date ? new Date(exam_date) : course.exam_date
            }
        });

        res.json(updatedCourse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating user course' });
    }
};

const bulkUpdateUserCourses = async (req, res) => {
    try {
        const { courses } = req.body;
        // courses: [{ courseId: "...", examDate: "2026-04-17" | null }]

        if (!Array.isArray(courses)) {
            return res.status(400).json({ message: 'Invalid data format array expected' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Prepare operations for transaction
        const updateOps = [];

        for (const c of courses) {
            // Validate course belongs to user
            const existing = await prisma.userCourse.findFirst({
                where: { id: c.courseId, user_id: req.user.id, is_archived: false }
            });

            if (!existing) continue;

            let parsedDate = null;
            if (c.examDate) {
                parsedDate = new Date(c.examDate);
                if (parsedDate < today) {
                    return res.status(400).json({ message: 'Exam dates cannot be in the past' });
                }
            }

            updateOps.push(
                prisma.userCourse.update({
                    where: { id: c.courseId },
                    data: { 
                        exam_date: parsedDate, 
                        exam_time: c.examTime || null,
                        exam_venue: c.examVenue || null,
                        exam_instructions: c.examInstructions || null,
                        exam_duration: c.examDuration ? parseInt(c.examDuration) : 180
                    }
                })
            );
        }

        // Execute all updates in a single transaction
        await prisma.$transaction(updateOps);

        res.json({ message: 'Bulk update successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error bulk updating courses' });
    }
};

const markExamCompleted = async (req, res) => {
    try {
        const { id } = req.params;
        const userCourse = await prisma.userCourse.findFirst({
            where: { id, user_id: req.user.id, is_archived: false }
        });

        if (!userCourse) {
            return res.status(404).json({ message: 'Course not found' });
        }

        await prisma.userCourse.update({
            where: { id },
            data: { is_completed: true }
        });

        res.json({ message: 'Exam marked as completed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error marking exam completed' });
    }
};

const addCustomUserCourse = async (req, res) => {
    try {
        const { code, title, units, difficulty, level, semester } = req.body;
        const user_id = req.user.id;

        const profile = await prisma.academicProfile.findUnique({ where: { user_id } });
        if (!profile) {
            return res.status(404).json({ message: 'Academic profile not found' });
        }
        const program = await prisma.program.findUnique({ where: { name: profile.program } });

        const newCourse = await prisma.course.create({
            data: {
                program_id: program.id,
                code,
                title,
                units: parseInt(units) || 3,
                difficulty: parseFloat(difficulty) || 3.0,
                level: parseInt(level) || profile.level,
                semester: parseInt(semester) || profile.semester
            }
        });

        const newUserCourse = await prisma.userCourse.create({
            data: {
                user_id,
                course_id: newCourse.id,
                is_selected: true
            },
            include: { course: { include: { courseTopics: true } } }
        });

        res.status(201).json(newUserCourse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating custom course' });
    }
};

const editUserCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, title, units, difficulty } = req.body;
        
        const userCourse = await prisma.userCourse.findFirst({
            where: { id, user_id: req.user.id, is_archived: false },
            include: { course: true }
        });

        if (!userCourse) return res.status(404).json({ message: 'Course not found' });

        await prisma.course.update({
            where: { id: userCourse.course_id },
            data: {
                code: code || userCourse.course.code,
                title: title || userCourse.course.title,
                units: units ? parseInt(units) : userCourse.course.units,
                difficulty: difficulty ? parseFloat(difficulty) : userCourse.course.difficulty
            }
        });

        const updatedUc = await prisma.userCourse.findUnique({
            where: { id },
            include: { course: { include: { courseTopics: true } } }
        });
        res.json(updatedUc);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error editing course' });
    }
};

const deleteUserCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const userCourse = await prisma.userCourse.findFirst({
            where: { id, user_id, is_archived: false }
        });
        
        if (!userCourse) return res.status(404).json({ message: 'Course not found' });

        await prisma.userCourse.delete({
            where: { id }
        });

        // Optional: We delete the actual course if it's completely unlinked, but keeping it simple.
        res.json({ message: 'Course removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting user course' });
    }
};

module.exports = { getCurriculum, saveUserCourses, getUserCourses, updateUserCourse, bulkUpdateUserCourses, markExamCompleted, addCustomUserCourse, editUserCourse, deleteUserCourse };
