const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateStudyPlan } = require('../services/allocationEngine');

const prisma = new PrismaClient();

// ==========================================
// 1. DASHBOARD
// ==========================================
const getDashboardStats = async (req, res) => {
    try {
        const studentCount = await prisma.user.count({ 
            where: { 
                role: 'STUDENT',
                NOT: {
                    email: { startsWith: 'test_' }
                }
            } 
        });
        const programmeCount = await prisma.program.count();
        const courseCount = await prisma.course.count();
        const studyPlanCount = await prisma.studyPlan.count({
            where: {
                user: {
                    NOT: {
                        email: { startsWith: 'test_' }
                    }
                }
            }
        });

        const activeSession = await prisma.globalAcademicSession.findFirst({
            where: { status: 'ACTIVE' }
        });

        res.json({
            totalStudents: studentCount,
            totalProgrammes: programmeCount,
            totalCourses: courseCount,
            totalStudyPlans: studyPlanCount,
            activeSession: activeSession ? activeSession.name : 'None Active'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

// ==========================================
// 2. ACADEMIC STRUCTURE
// ==========================================
const getAcademicStructure = async (req, res) => {
    try {
        const sessions = await prisma.globalAcademicSession.findMany({
            orderBy: { start_date: 'asc' }
        });
        const windows = await prisma.semesterWindow.findMany({
            orderBy: { semester: 'asc' }
        });
        const programmes = await prisma.program.findMany({
            include: {
                courses: {
                    include: {
                        courseTopics: true
                    },
                    orderBy: [
                        { level: 'asc' },
                        { semester: 'asc' },
                        { code: 'asc' }
                    ]
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json({
            sessions,
            windows,
            programmes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching academic structure' });
    }
};

// --- Sessions CRUD ---
const createSession = async (req, res) => {
    try {
        const { name, start_date, end_date, registration_opens, registration_closes, status } = req.body;
        
        if (status === 'ACTIVE') {
            // Close other active sessions
            await prisma.globalAcademicSession.updateMany({
                where: { status: 'ACTIVE' },
                data: { status: 'CLOSED' }
            });
        }

        const session = await prisma.globalAcademicSession.create({
            data: {
                name,
                start_date: new Date(start_date),
                end_date: new Date(end_date),
                registration_opens: new Date(registration_opens),
                registration_closes: new Date(registration_closes),
                status: status || 'UPCOMING'
            }
        });
        res.status(201).json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating academic session' });
    }
};

const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_date, end_date, registration_opens, registration_closes, status } = req.body;

        if (status === 'ACTIVE') {
            // Close other active sessions
            await prisma.globalAcademicSession.updateMany({
                where: {
                    status: 'ACTIVE',
                    NOT: { id }
                },
                data: { status: 'CLOSED' }
            });
        }

        const session = await prisma.globalAcademicSession.update({
            where: { id },
            data: {
                name,
                start_date: start_date ? new Date(start_date) : undefined,
                end_date: end_date ? new Date(end_date) : undefined,
                registration_opens: registration_opens ? new Date(registration_opens) : undefined,
                registration_closes: registration_closes ? new Date(registration_closes) : undefined,
                status
            }
        });
        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating academic session' });
    }
};

const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.globalAcademicSession.delete({ where: { id } });
        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting academic session' });
    }
};

// --- Windows CRUD ---
const createWindow = async (req, res) => {
    try {
        const { semester, start_month, start_day, end_month, end_day, allow_early_reg, reg_lead_time } = req.body;
        const window = await prisma.semesterWindow.create({
            data: {
                semester,
                start_month: parseInt(start_month),
                start_day: parseInt(start_day),
                end_month: parseInt(end_month),
                end_day: parseInt(end_day),
                allow_early_reg: Boolean(allow_early_reg),
                reg_lead_time: parseInt(reg_lead_time)
            }
        });
        res.status(201).json(window);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating semester window' });
    }
};

const updateWindow = async (req, res) => {
    try {
        const { id } = req.params;
        const { start_month, start_day, end_month, end_day, allow_early_reg, reg_lead_time } = req.body;
        const window = await prisma.semesterWindow.update({
            where: { id },
            data: {
                start_month: start_month !== undefined ? parseInt(start_month) : undefined,
                start_day: start_day !== undefined ? parseInt(start_day) : undefined,
                end_month: end_month !== undefined ? parseInt(end_month) : undefined,
                end_day: end_day !== undefined ? parseInt(end_day) : undefined,
                allow_early_reg: allow_early_reg !== undefined ? Boolean(allow_early_reg) : undefined,
                reg_lead_time: reg_lead_time !== undefined ? parseInt(reg_lead_time) : undefined
            }
        });
        res.json(window);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating semester window' });
    }
};

const deleteWindow = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.semesterWindow.delete({ where: { id } });
        res.json({ message: 'Semester window deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting semester window' });
    }
};

// --- Programmes CRUD ---
const createProgramme = async (req, res) => {
    try {
        const { name } = req.body;
        const prog = await prisma.program.create({ data: { name } });
        res.status(201).json(prog);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating programme' });
    }
};

const updateProgramme = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const prog = await prisma.program.update({
            where: { id },
            data: { name }
        });
        res.json(prog);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating programme' });
    }
};

const deleteProgramme = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.program.delete({ where: { id } });
        res.json({ message: 'Programme deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting programme' });
    }
};

// --- Courses CRUD ---
const createCourse = async (req, res) => {
    try {
        const { program_id, code, title, units, difficulty, level, semester } = req.body;
        const course = await prisma.course.create({
            data: {
                program_id,
                code,
                title,
                units: parseInt(units),
                difficulty: parseFloat(difficulty),
                level: parseInt(level),
                semester: parseInt(semester)
            }
        });
        res.status(201).json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating course' });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, title, units, difficulty, level, semester } = req.body;
        const course = await prisma.course.update({
            where: { id },
            data: {
                code,
                title,
                units: units !== undefined ? parseInt(units) : undefined,
                difficulty: difficulty !== undefined ? parseFloat(difficulty) : undefined,
                level: level !== undefined ? parseInt(level) : undefined,
                semester: semester !== undefined ? parseInt(semester) : undefined
            }
        });
        res.json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating course' });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.course.delete({ where: { id } });
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting course' });
    }
};

// --- Topics CRUD ---
const createTopic = async (req, res) => {
    try {
        const { course_id, topic_name, default_weight } = req.body;
        const topic = await prisma.courseTopic.create({
            data: {
                course_id,
                topic_name,
                default_weight: default_weight !== undefined ? parseFloat(default_weight) : 1.0
            }
        });
        res.status(201).json(topic);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating topic' });
    }
};

const updateTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { topic_name, default_weight } = req.body;
        const topic = await prisma.courseTopic.update({
            where: { id },
            data: {
                topic_name,
                default_weight: default_weight !== undefined ? parseFloat(default_weight) : undefined
            }
        });
        res.json(topic);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating topic' });
    }
};

const deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.courseTopic.delete({ where: { id } });
        res.json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting topic' });
    }
};


// ==========================================
// 3. STUDENTS
// ==========================================
const getStudents = async (req, res) => {
    try {
        const { search } = req.query;
        let where = { 
            role: 'STUDENT',
            NOT: {
                email: { startsWith: 'test_' }
            }
        };

        if (search) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ]
                }
            ];
        }

        const students = await prisma.user.findMany({
            where,
            include: {
                academicProfile: true
            },
            orderBy: { name: 'asc' }
        });

        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching students list' });
    }
};

const getStudentProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await prisma.user.findUnique({
            where: { id },
            include: {
                academicProfile: true,
                userCourses: {
                    where: { is_archived: false },
                    include: { course: true }
                },
                userTopics: {
                    where: { is_archived: false }
                },
                quizResults: {
                    orderBy: { taken_at: 'desc' }
                },
                studyPlans: {
                    where: { is_archived: false },
                    include: {
                        sessions: {
                            where: { is_archived: false },
                            include: { topic: true }
                        }
                    },
                    orderBy: { generated_date: 'desc' }
                }
            }
        });

        if (!student || student.role !== 'STUDENT') {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        res.json(student);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching student profile' });
    }
};

const toggleStudentActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const updatedStudent = await prisma.user.update({
            where: { id },
            data: { is_active: Boolean(is_active) }
        });

        res.json({
            message: `Account successfully ${updatedStudent.is_active ? 'activated' : 'deactivated'}`,
            student: { id: updatedStudent.id, is_active: updatedStudent.is_active }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error toggling student account status' });
    }
};

const regenerateStudentPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await generateStudyPlan(id, true, false);
        res.json({ message: 'Study plan successfully regenerated', result });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error regenerating plan' });
    }
};

// ==========================================
// 4. ANALYTICS (Dissertation Supporting)
// ==========================================
const getCoreAnalytics = async (req, res) => {
    try {
        // 1. Average Quiz Score
        const quizAvg = await prisma.quizResult.aggregate({
            _avg: { score_percentage: true }
        });
        const averageQuizScore = quizAvg._avg.score_percentage || 0;

        // 2. Average Mastery
        const masteryAvg = await prisma.userTopic.aggregate({
            _avg: { mastery_level: true }
        });
        const averageMastery = (masteryAvg._avg.mastery_level || 0) * 100;

        // 3. Average Study Hours
        const sessionHoursSum = await prisma.studySession.aggregate({
            where: { completed: true },
            _sum: { allocated_hours: true }
        });
        const totalStudyHours = sessionHoursSum._sum.allocated_hours || 0;
        const studentCount = await prisma.user.count({ where: { role: 'STUDENT' } });
        const averageStudyHours = studentCount > 0 ? (totalStudyHours / studentCount) : 0;

        // 4. Risk Distribution
        const students = await prisma.user.findMany({
            where: { role: 'STUDENT' },
            include: {
                quizResults: true,
                progressLogs: true
            }
        });

        let lowRisk = 0;
        let medRisk = 0;
        let highRisk = 0;

        students.forEach(student => {
            const quizScores = student.quizResults.map(r => r.score_percentage);
            const quizAverage = quizScores.length > 0 ? (quizScores.reduce((a, b) => a + b, 0) / quizScores.length) / 100 : null;
            
            const consistencyScores = student.progressLogs.map(l => l.consistency_score);
            const consistencyScore = consistencyScores.length > 0 ? (consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length) : null;
            
            const qA = quizAverage !== null ? quizAverage : 0.5;
            const cS = consistencyScore !== null ? consistencyScore : 0.8;
            const risk = ((1 - qA) * 0.6) + ((1 - cS) * 0.4);

            if (risk < 0.35) {
                lowRisk++;
            } else if (risk > 0.65) {
                highRisk++;
            } else {
                medRisk++;
            }
        });

        // 5. Average Study Plan Completion by Programme
        const studentsList = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                NOT: {
                    email: { startsWith: 'test_' }
                }
            },
            include: {
                academicProfile: true,
                studyPlans: {
                    include: {
                        sessions: true
                    }
                }
            }
        });

        const programCompletionMap = {};

        studentsList.forEach(student => {
            const progName = student.academicProfile?.program || 'Unenrolled';
            if (!programCompletionMap[progName]) {
                programCompletionMap[progName] = { totalSessions: 0, completedSessions: 0 };
            }

            if (student.studyPlans) {
                student.studyPlans.forEach(plan => {
                    if (plan.sessions) {
                        programCompletionMap[progName].totalSessions += plan.sessions.length;
                        programCompletionMap[progName].completedSessions += plan.sessions.filter(s => s.completed).length;
                    }
                });
            }
        });

        const studyPlanCompletion = Object.keys(programCompletionMap).map(prog => {
            const data = programCompletionMap[prog];
            const rate = data.totalSessions > 0 ? (data.completedSessions / data.totalSessions) * 100 : 0;
            return {
                program: prog,
                completionRate: Math.round(rate * 10) / 10
            };
        });

        res.json({
            averageQuizScore,
            averageMastery,
            averageStudyHours,
            riskDistribution: {
                lowRisk,
                mediumRisk: medRisk,
                highRisk
            },
            studyPlanCompletion
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error compiling core analytics' });
    }
};

// ==========================================
// 5. SETTINGS
// ==========================================
const getSettings = async (req, res) => {
    try {
        let config = await prisma.systemConfig.findUnique({
            where: { id: 'system_config' }
        });

        if (!config) {
            config = await prisma.systemConfig.create({
                data: {
                    id: 'system_config',
                    learning_rate_eta: 0.20,
                    decay_constant_lambda: 0.10,
                    weight_difficulty: 0.20,
                    weight_exam: 0.30,
                    weight_mastery: 0.15,
                    weight_risk: 0.20,
                    weight_course_unit: 0.15,
                    min_session_duration: 30,
                    max_session_duration: 180,
                    allow_morning_revision: false
                }
            });
        }

        res.json(config);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error loading settings' });
    }
};

const updateSettings = async (req, res) => {
    try {
        const {
            learning_rate_eta,
            decay_constant_lambda,
            weight_difficulty,
            weight_exam,
            weight_mastery,
            weight_risk,
            weight_course_unit,
            min_session_duration,
            max_session_duration,
            allow_morning_revision
        } = req.body;

        const config = await prisma.systemConfig.update({
            where: { id: 'system_config' },
            data: {
                learning_rate_eta: parseFloat(learning_rate_eta),
                decay_constant_lambda: parseFloat(decay_constant_lambda),
                weight_difficulty: parseFloat(weight_difficulty),
                weight_exam: parseFloat(weight_exam),
                weight_mastery: parseFloat(weight_mastery),
                weight_risk: parseFloat(weight_risk),
                weight_course_unit: parseFloat(weight_course_unit),
                min_session_duration: parseInt(min_session_duration),
                max_session_duration: parseInt(max_session_duration),
                allow_morning_revision: Boolean(allow_morning_revision)
            }
        });

        res.json({ message: 'Settings successfully updated', config });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating settings' });
    }
};

// ==========================================
// 6. ADMIN USERS
// ==========================================
const getAdmins = async (req, res) => {
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true, name: true, email: true, created_at: true }
        });
        res.json(admins);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error loading admin users' });
    }
};

const addAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newAdmin = await prisma.user.create({
            data: {
                name,
                email,
                password_hash,
                role: 'ADMIN',
                onboarding_stage: 'COMPLETE'
            }
        });

        res.status(201).json({
            message: 'Admin successfully created',
            admin: { id: newAdmin.id, name: newAdmin.name, email: newAdmin.email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating admin user' });
    }
};

const removeAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ message: 'You cannot remove your own admin account.' });
        }

        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) {
            return res.status(400).json({ message: 'System must contain at least one admin account.' });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ message: 'Admin user successfully removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing admin user' });
    }
};

const changeAdminPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id },
            data: { password_hash }
        });

        res.json({ message: 'Admin password successfully updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating admin password' });
    }
};

const nodemailer = require('nodemailer');

const sendEmailSMTP = async (to, subject, htmlContent) => {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
        throw new Error('SMTP credentials are not configured');
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });

    await transporter.sendMail({
        from: `"NeuroPlan" <${smtpUser}>`,
        to,
        subject,
        html: htmlContent
    });
};

const notifyStudentsOfSession = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await prisma.globalAcademicSession.findUnique({
            where: { id }
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const students = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                NOT: {
                    email: { startsWith: 'test_' }
                }
            },
            select: {
                email: true,
                name: true
            }
        });

        const emailList = students.map(s => s.email).filter(Boolean);
        if (emailList.length === 0) {
            return res.json({ message: 'No students found to notify.' });
        }

        const subject = `Registration Open: ${session.name} - NeuroPlan`;
        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Next Semester Registration is Open!</h2>
            <p>Hello,</p>
            <p>We are excited to announce that the new academic session <strong>${session.name}</strong> has been officially opened.</p>
            <p>Please log in to your NeuroPlan dashboard to select your courses and generate your customized study plans for this semester.</p>
            <div style="margin: 24px 0;">
              <a href="https://neuroplan-v2.vercel.app/" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
            </div>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="font-size: 11px; color: #64748b; margin-top: 16px;">This is an automated notification from NeuroPlan. If you have any questions, please contact your administrator.</p>
          </div>
        `;

        let sentCount = 0;
        const failedEmails = [];

        for (const email of emailList) {
            try {
                await sendEmailSMTP(email, subject, htmlContent);
                sentCount++;
            } catch (err) {
                console.error(`Failed to send email to ${email}:`, err);
                failedEmails.push(email);
            }
        }

        res.json({
            message: `Notification emails processed. Sent to ${sentCount} students.`,
            failedEmails
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error notifying students' });
    }
};

const resetStudentPassword = async (req, res) => {
    try {
        const { id } = req.params;

        const student = await prisma.user.findUnique({
            where: { id }
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let tempPassword = "";
        for (let i = 0; i < 12; i++) {
            tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        await prisma.$executeRawUnsafe(
            'UPDATE auth.users SET encrypted_password = $1 WHERE id = cast($2 as uuid)',
            hashedPassword,
            id
        );

        const subject = 'Your Password Has Been Reset - NeuroPlan';
        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Temporary Password Generated</h2>
            <p>Hello ${student.name || 'Student'},</p>
            <p>Your administrator has reset your password for your <strong>NeuroPlan</strong> account.</p>
            <p>Your temporary password is: <strong style="font-size: 16px; background-color: #f1f5f9; padding: 6px 12px; border-radius: 4px; font-family: monospace; display: inline-block; margin: 8px 0; border: 1px solid #cbd5e1; color: #0f172a;">${tempPassword}</strong></p>
            <p>Please log in using this temporary password and update it immediately in your settings.</p>
            <div style="margin: 24px 0;">
              <a href="https://neuroplan-v2.vercel.app/" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Login to Dashboard</a>
            </div>
            <p style="font-size: 11px; color: #64748b; margin-top: 16px;">This email was sent from your administration. If you did not request a password reset, please contact your administrator.</p>
          </div>
        `;

        try {
            await sendEmailSMTP(student.email, subject, htmlContent);
        } catch (emailErr) {
            console.error('Failed to send reset password email:', emailErr);
            return res.json({
                message: 'Student password reset successfully but email notification failed',
                temporaryPassword: tempPassword,
                emailError: emailErr.message
            });
        }

        res.json({
            message: 'Student password reset successfully',
            temporaryPassword: tempPassword
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error resetting student password' });
    }
};

module.exports = {
    getDashboardStats,
    getAcademicStructure,
    createSession,
    updateSession,
    deleteSession,
    createWindow,
    updateWindow,
    deleteWindow,
    createProgramme,
    updateProgramme,
    deleteProgramme,
    createCourse,
    updateCourse,
    deleteCourse,
    createTopic,
    updateTopic,
    deleteTopic,
    getStudents,
    getStudentProfile,
    toggleStudentActive,
    regenerateStudentPlan,
    getCoreAnalytics,
    getSettings,
    updateSettings,
    getAdmins,
    addAdmin,
    removeAdmin,
    changeAdminPassword,
    notifyStudentsOfSession,
    resetStudentPassword
};
