const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const allocationEngine = require('./src/services/allocationEngine');

const FEMI_EMAIL = 'femidan@gmail.com';

async function getFemi() {
    const user = await prisma.user.findUnique({
        where: { email: FEMI_EMAIL }
    });
    if (!user) {
        throw new Error(`User with email ${FEMI_EMAIL} (Femi Dan) was not found in the database. Run seed first.`);
    }
    return user;
}

async function resetToFresh(userId) {
    console.log(`\n🧹 [State 1] Resetting ${FEMI_EMAIL} to FRESH (Pre-Onboarding stage)...`);

    // Delete cascading dependencies
    await prisma.studySession.deleteMany({ where: { studyPlan: { user_id: userId } } });
    await prisma.studyPlan.deleteMany({ where: { user_id: userId } });
    await prisma.studyAvailability.deleteMany({ where: { user_id: userId } });
    await prisma.progressLog.deleteMany({ where: { user_id: userId } });
    await prisma.quizResult.deleteMany({ where: { user_id: userId } });
    await prisma.mistakeLog.deleteMany({ where: { user_id: userId } });
    await prisma.userTopic.deleteMany({ where: { user_id: userId } });
    await prisma.userCourse.deleteMany({ where: { user_id: userId } });
    await prisma.academicSession.deleteMany({ where: { user_id: userId } });
    await prisma.academicProfile.deleteMany({ where: { user_id: userId } });

    // Set onboarding stage back to PROFILE to trigger the onboarding wizard
    await prisma.user.update({
        where: { id: userId },
        data: {
            onboarding_stage: 'PROFILE',
            streak_count: 0,
            streak_last_updated: null,
            post_exam_preference: 'REST',
            allow_morning_revision: false,
            preferred_focus_window: 'ANY'
        }
    });

    console.log(`✅ Reset successfully. When logging into Femi's account, they will start at the Onboarding Page.`);
}

async function setupStandardPlan(userId) {
    console.log(`\n📅 [State 2] Setting up Standard Plan for ${FEMI_EMAIL}...`);

    // 1. Clear old data to prevent conflicts
    await prisma.studySession.deleteMany({ where: { studyPlan: { user_id: userId } } });
    await prisma.studyPlan.deleteMany({ where: { user_id: userId } });
    await prisma.studyAvailability.deleteMany({ where: { user_id: userId } });
    await prisma.progressLog.deleteMany({ where: { user_id: userId } });
    await prisma.quizResult.deleteMany({ where: { user_id: userId } });
    await prisma.mistakeLog.deleteMany({ where: { user_id: userId } });
    await prisma.userTopic.deleteMany({ where: { user_id: userId } });
    await prisma.userCourse.deleteMany({ where: { user_id: userId } });
    await prisma.academicSession.deleteMany({ where: { user_id: userId } });
    await prisma.academicProfile.deleteMany({ where: { user_id: userId } });

    // 2. Set onboarding_stage to COMPLETE
    await prisma.user.update({
        where: { id: userId },
        data: {
            onboarding_stage: 'COMPLETE',
            streak_count: 12, // Visual streak badge for the video!
            streak_last_updated: new Date(),
            post_exam_preference: 'LIGHT',
            allow_morning_revision: true,
            preferred_focus_window: 'ANY'
        }
    });

    // 3. Create academic session (starting today)
    const semesterStart = new Date();
    semesterStart.setHours(0, 0, 0, 0);
    const academicSession = await prisma.academicSession.create({
        data: {
            user_id: userId,
            level: 100,
            semester: '2nd Semester',
            start_date: semesterStart
        }
    });

    // 4. Create Academic Profile
    await prisma.academicProfile.create({
        data: {
            user_id: userId,
            program: 'Computer Science',
            level: 100,
            semester: 2,
            curriculum_type: 'BMAS',
            current_cgpa: 4.25,
            academic_goal: 'First Class'
        }
    });

    // 5. Fetch level 100, semester 2 Computer Science courses
    const csProgram = await prisma.program.findFirst({
        where: { name: 'Computer Science' }
    });
    if (!csProgram) {
        throw new Error("Computer Science program not found. Seed the DB first.");
    }

    const curriculumCourses = await prisma.course.findMany({
        where: {
            program_id: csProgram.id,
            level: 100,
            semester: 2
        }
    });

    console.log(`Found ${curriculumCourses.length} curriculum courses to link.`);

    // 6. Link User Courses with dynamic exam dates (14 days, 18 days, 21 days from now)
    const userCoursesToCreate = [];
    const examOffsetDays = {
        'CSC102': 14, // Intro to Programming (High difficulty)
        'MTH102': 18, // Calculus II
        'PHY102': 21, // General Physics II
        'STA101': 25, // Intro to Statistics
        'GST102': 30  // Nigerian Peoples
    };

    for (const course of curriculumCourses) {
        const offset = examOffsetDays[course.code] || 15;
        const examDate = new Date();
        examDate.setDate(examDate.getDate() + offset);
        examDate.setHours(9, 0, 0, 0); // 9 AM exam time

        const uc = await prisma.userCourse.create({
            data: {
                user_id: userId,
                course_id: course.id,
                exam_date: examDate,
                exam_time: '09:00',
                exam_venue: 'Lecture Theatre A',
                academicSessionId: academicSession.id
            }
        });

        // Initialize progress logs
        await prisma.progressLog.create({
            data: {
                user_id: userId,
                user_course_id: uc.id,
                study_hours_logged: 4.5,
                checklist_completion: 20,
                consistency_score: 0.85
            }
        });

        // 7. Seed concrete topics for priority calculations
        let topics = [];
        if (course.code === 'CSC102') {
            topics = ['Variables and Loops', 'Arrays and Functions', 'Object-Oriented Basics'];
        } else if (course.code === 'MTH102') {
            topics = ['Integration Methods', 'Infinite Series', 'Differential Equations'];
        } else if (course.code === 'PHY102') {
            topics = ['Electrostatics', 'Electric Current', 'Magnetism'];
        } else {
            topics = ['General Coursework', 'Revision Exercises'];
        }

        for (const topicName of topics) {
            await prisma.userTopic.create({
                data: {
                    user_id: userId,
                    course_id: course.id,
                    topic_name: topicName,
                    mastery_level: 0.35, // starting mastery
                    is_selected: true
                }
            });
        }
    }

    // 8. Seed Study Availability Schedule (16 Hours total)
    const availabilities = [
        { day_of_week: 'Mon', start_time: '14:00', end_time: '16:30' }, // 2.5h
        { day_of_week: 'Tue', start_time: '15:00', end_time: '17:00' }, // 2.0h
        { day_of_week: 'Thu', start_time: '16:00', end_time: '18:00' }, // 2.0h
        { day_of_week: 'Fri', start_time: '14:00', end_time: '16:30' }, // 2.5h
        { day_of_week: 'Sat', start_time: '10:00', end_time: '14:00' }, // 4.0h
        { day_of_week: 'Sun', start_time: '12:00', end_time: '15:00' }  // 3.0h
    ];

    for (const avail of availabilities) {
        await prisma.studyAvailability.create({
            data: {
                user_id: userId,
                day_of_week: avail.day_of_week,
                start_time: avail.start_time,
                end_time: avail.end_time
            }
        });
    }

    // 9. Run Allocation Engine to generate study sessions
    console.log("Running Allocation Engine...");
    const plan = await allocationEngine.generateStudyPlan(userId, true, true);

    console.log(`✅ Standard Plan setup complete.`);
    console.log(`- Weeks Generated: ${plan.totalWeeksGenerated}`);
    console.log(`- Total Sessions Created: ${plan.sessionsCreated}`);
}

async function triggerQuizFailure(userId) {
    console.log(`\n🚨 [State 3] Simulating Quiz Failure (Adding low score on CSC102)...`);

    // 1. Fetch CSC102 course
    const csc102 = await prisma.course.findFirst({
        where: { code: 'CSC102' }
    });
    if (!csc102) {
        throw new Error("CSC102 course not found in database.");
    }

    // 2. Clear old quiz results for CSC102
    await prisma.quizResult.deleteMany({
        where: { user_id: userId, course_id: csc102.id }
    });

    // 3. Insert low score (30%)
    await prisma.quizResult.create({
        data: {
            user_id: userId,
            course_id: csc102.id,
            topic_name: 'Arrays and Functions',
            score_percentage: 30, // Failure triggers high risk!
            difficulty: 4
        }
    });

    // 4. Also insert a high score in a different course to emphasize contrast
    const phy102 = await prisma.course.findFirst({
        where: { code: 'PHY102' }
    });
    if (phy102) {
        await prisma.quizResult.deleteMany({
            where: { user_id: userId, course_id: phy102.id }
        });
        await prisma.quizResult.create({
            data: {
                user_id: userId,
                course_id: phy102.id,
                topic_name: 'Electrostatics',
                score_percentage: 95, // Excel score triggers low risk
                difficulty: 4
            }
        });
    }

    // 5. Trigger study plan recalculation
    console.log("Recalculating adaptive hours...");
    const plan = await allocationEngine.generateStudyPlan(userId, true, true);

    // 6. Fetch stats for validation printout
    const sessions = await prisma.studySession.findMany({
        where: { studyPlan: { user_id: userId } },
        include: { topic: { include: { course: true } } }
    });

    // Calculate allocation distribution
    const distribution = {};
    sessions.forEach(s => {
        const code = s.topic.course.code;
        distribution[code] = (distribution[code] || 0) + s.allocated_hours;
    });

    console.log(`✅ Quiz Failure Simulated.`);
    console.log(`Recalculated Study Session Distribution (Hours allocated this week):`);
    console.log(JSON.stringify(distribution, null, 2));
    console.log(`Notice how CSC102 (30% Quiz score -> High Risk) is allocated significantly more hours compared to PHY102 (95% score).`);
}

async function main() {
    const args = process.argv.slice(2);
    const mode = args[0];

    if (!mode || !['fresh', 'plan', 'quiz'].includes(mode)) {
        console.log(`
❌ Invalid usage.
Usage:
  node video_demo_states.js fresh  -> Set Femi to pre-onboarding state
  node video_demo_states.js plan   -> Create standard curriculum plan (16 hours)
  node video_demo_states.js quiz   -> Trigger low-score quiz on CSC102 & recalculate
`);
        process.exit(1);
    }

    try {
        const user = await getFemi();
        if (mode === 'fresh') {
            await resetToFresh(user.id);
        } else if (mode === 'plan') {
            await setupStandardPlan(user.id);
        } else if (mode === 'quiz') {
            await triggerQuizFailure(user.id);
        }
    } catch (err) {
        console.error("❌ Error running script:", err.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
