const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getOrCreateActiveSemesterWindow = async (tx = prisma) => {
    const today = new Date();
    const currentYear = today.getFullYear();

    let activeWindow = await tx.activeSemesterWindow.findFirst({
        where: {
            start_date: { lte: today },
            end_date: { gte: today },
            is_active: true
        }
    });

    if (!activeWindow) {
        // Find active GlobalAcademicSession
        const activeSession = await tx.globalAcademicSession.findFirst({
            where: { status: 'ACTIVE' }
        });

        // Find all SemesterWindow rules
        const semesterWindows = await tx.semesterWindow.findMany();

        let matchedRule = null;
        if (semesterWindows.length > 0) {
            const todayMonth = today.getMonth() + 1;
            const todayDay = today.getDate();
            const todayVal = todayMonth * 100 + todayDay;

            for (const w of semesterWindows) {
                const startVal = w.start_month * 100 + w.start_day;
                const endVal = w.end_month * 100 + w.end_day;

                if (startVal <= endVal) {
                    if (todayVal >= startVal && todayVal <= endVal) {
                        matchedRule = w;
                        break;
                    }
                } else {
                    if (todayVal >= startVal || todayVal <= endVal) {
                        matchedRule = w;
                        break;
                    }
                }
            }
        }

        let name, start, end;
        if (matchedRule) {
            // Normalize name to what the app expects ("1st Semester" or "2nd Semester")
            const ruleName = matchedRule.semester.trim().toLowerCase();
            if (ruleName === 'first semester' || ruleName === '1st semester') {
                name = '1st Semester';
            } else if (ruleName === 'second semester' || ruleName === '2nd semester') {
                name = '2nd Semester';
            } else {
                name = matchedRule.semester;
            }

            // Determine years based on whether the rule spans across year boundary
            const startVal = matchedRule.start_month * 100 + matchedRule.start_day;
            const endVal = matchedRule.end_month * 100 + matchedRule.end_day;

            let startYear = currentYear;
            let endYear = currentYear;

            if (startVal > endVal) {
                const todayMonth = today.getMonth() + 1;
                if (todayMonth >= matchedRule.start_month) {
                    endYear = currentYear + 1;
                } else if (todayMonth <= matchedRule.end_month) {
                    startYear = currentYear - 1;
                }
            }

            start = new Date(startYear, matchedRule.start_month - 1, matchedRule.start_day);
            end = new Date(endYear, matchedRule.end_month - 1, matchedRule.end_day, 23, 59, 59, 999);
        } else {
            // Safe fallback if no rules are configured
            if (today.getMonth() < 6) { // Jan - Jun
                name = "1st Semester";
                start = new Date(currentYear, 0, 1);
                end = new Date(currentYear, 5, 30, 23, 59, 59, 999);
            } else { // Jul - Dec
                name = "2nd Semester";
                start = new Date(currentYear, 6, 1);
                end = new Date(currentYear, 11, 31, 23, 59, 59, 999);
            }
        }

        activeWindow = await tx.activeSemesterWindow.create({
            data: {
                name,
                start_date: start,
                end_date: end
            }
        });
    }
    return activeWindow;
};

const createProfile = async (req, res) => {
    try {
        const { program, level, semester, systemSemester, curriculum_type, current_cgpa, academic_goal } = req.body;
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

        // Perform in a transaction to guarantee consistency
        const profile = await prisma.$transaction(async (tx) => {
            const systemSemVal = systemSemester ? parseInt(systemSemester) : (parsedSemester === 1 ? 1 : 2);
            const userSelectedSemStr = systemSemVal === 1 ? '1st Semester' : '2nd Semester';

            // Find target semester window matching userSelectedSemStr
            let targetWindow = await tx.activeSemesterWindow.findFirst({
                where: {
                    name: userSelectedSemStr,
                    is_active: true
                },
                orderBy: {
                    start_date: 'asc'
                }
            });

            if (!targetWindow) {
                const today = new Date();
                const currentYear = today.getFullYear();
                let start, end;

                if (userSelectedSemStr === "1st Semester") {
                    const year = today.getMonth() >= 6 ? currentYear + 1 : currentYear;
                    start = new Date(year, 0, 1);
                    end = new Date(year, 5, 30, 23, 59, 59, 999);
                } else {
                    start = new Date(currentYear, 6, 1);
                    end = new Date(currentYear, 11, 31, 23, 59, 59, 999);
                }

                targetWindow = await tx.activeSemesterWindow.create({
                    data: {
                        name: userSelectedSemStr,
                        start_date: start,
                        end_date: end,
                        is_active: true
                    }
                });
            }

            // Create Academic Profile
            const prof = await tx.academicProfile.create({
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

            // Create User Selected Semester record
            await tx.userSelectedSemester.upsert({
                where: { user_id },
                create: {
                    user_id,
                    semester: userSelectedSemStr
                },
                update: {
                    semester: userSelectedSemStr
                }
            });

            // Create Academic Session anchored to selected semester window
            await tx.academicSession.create({
                data: {
                    user_id,
                    semester: targetWindow.name,
                    level: parsedLevel,
                    start_date: targetWindow.start_date,
                    end_date: targetWindow.end_date
                }
            });

            // Advance Onboarding Stage
            await tx.user.update({
                where: { id: user_id },
                data: { onboarding_stage: 'COURSES' }
            });

            return prof;
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
