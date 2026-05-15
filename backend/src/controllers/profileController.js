const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createProfile = async (req, res) => {
    try {
        const { program, level, semester, curriculum_type, current_cgpa, academic_goal } = req.body;
        const user_id = req.user.id;

        const existingProfile = await prisma.academicProfile.findUnique({
            where: { user_id },
        });

        if (existingProfile) {
            return res.status(400).json({ message: 'Profile already exists' });
        }

        const parsedLevel = parseInt(level);
        const parsedSemester = semester ? parseInt(semester) : 1;
        const requiresCGPA = parsedLevel > 100 || (parsedLevel === 100 && parsedSemester === 2);

        if (requiresCGPA && (!current_cgpa || parseFloat(current_cgpa) <= 0)) {
            return res.status(400).json({ message: "Current CGPA is required" });
        }

        const profile = await prisma.academicProfile.create({
            data: {
                user_id,
                program,
                level: parsedLevel,
                semester: parsedSemester,
                curriculum_type,
                current_cgpa: current_cgpa && parseFloat(current_cgpa) > 0 ? parseFloat(current_cgpa) : null,
                academic_goal,
            },
        });

        // Determine session dates based on semester
        const currentYear = new Date().getFullYear();
        let startDate, endDate;
        const semInt = semester ? parseInt(semester) : 1;
        
        if (semInt === 1) {
            startDate = new Date(currentYear, 0, 1); // Jan 1
            endDate = new Date(currentYear, 5, 30);  // Jun 30
        } else {
            startDate = new Date(currentYear, 6, 1); // Jul 1
            endDate = new Date(currentYear, 11, 31); // Dec 31
        }

        const sessionName = `${currentYear} Session ${semInt}`;

        // Create Academic Session
        await prisma.academicSession.create({
            data: {
                user_id,
                semester: semInt === 1 ? '1st Semester' : '2nd Semester',
                level: parseInt(level),
                start_date: startDate,
                end_date: null
            }
        });

        // Advance Onboarding Stage
        await prisma.user.update({
            where: { id: user_id },
            data: { onboarding_stage: 'COURSES' }
        });

        res.status(201).json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating profile' });
    }
};

const getProfile = async (req, res) => {
    try {
        const profile = await prisma.academicProfile.findUnique({
            where: { user_id: req.user.id },
        });

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { program, level, curriculum_type, current_cgpa, academic_goal } = req.body;

        const profile = await prisma.academicProfile.update({
            where: { user_id: req.user.id },
            data: {
                program,
                level: level ? parseInt(level) : undefined,
                curriculum_type,
                current_cgpa: current_cgpa ? parseFloat(current_cgpa) : undefined,
                academic_goal,
            },
        });

        res.json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

const updateUserSettings = async (req, res) => {
    try {
        const { post_exam_preference, allow_morning_revision, preferred_focus_window, current_cgpa } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { 
                post_exam_preference: post_exam_preference !== undefined ? post_exam_preference : undefined,
                allow_morning_revision: allow_morning_revision !== undefined ? allow_morning_revision : undefined,
                preferred_focus_window: preferred_focus_window !== undefined ? preferred_focus_window : undefined
            }
        });

        if (current_cgpa !== undefined) {
            await prisma.academicProfile.update({
                where: { user_id: req.user.id },
                data: {
                    current_cgpa: current_cgpa !== null && current_cgpa !== '' ? parseFloat(current_cgpa) : null
                }
            });
        }

        res.json({ 
            message: 'Settings updated successfully', 
            post_exam_preference: user.post_exam_preference,
            allow_morning_revision: user.allow_morning_revision,
            preferred_focus_window: user.preferred_focus_window
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating settings' });
    }
}

module.exports = { createProfile, getProfile, updateProfile, updateUserSettings };
