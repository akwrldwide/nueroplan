const fs = require('fs');
const path = require('path');

// Dynamically override connection limit in DATABASE_URL for higher concurrency
if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('connection_limit=1', 'connection_limit=10');
} else {
    // If process.env.DATABASE_URL is not set, load .env file
    require('dotenv').config();
    if (process.env.DATABASE_URL) {
        process.env.DATABASE_URL = process.env.DATABASE_URL.replace('connection_limit=1', 'connection_limit=10');
    }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const { generateStudyPlan } = require('./src/services/allocationEngine');

// Helper to find a level that has courses for this program and semester
async function getValidLevelAndCourses(programId, semester) {
    const levels = [100, 200, 300, 400, 500];
    for (const lvl of levels) {
        const courses = await prisma.course.findMany({
            where: {
                program_id: programId,
                semester: semester,
                level: lvl
            }
        });
        if (courses.length > 0) {
            return { level: lvl, courses };
        }
    }
    // Search without semester filter if not found
    for (const lvl of levels) {
        const courses = await prisma.course.findMany({
            where: {
                program_id: programId,
                level: lvl
            }
        });
        if (courses.length > 0) {
            return { level: lvl, courses };
        }
    }
    return null;
}

// Concurrency Pool Helper
async function runWithConcurrency(tasks, concurrencyLimit) {
    const results = [];
    const executing = new Set();
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        executing.add(p);
        const clean = () => executing.delete(p);
        p.then(clean, clean);
        if (executing.size >= concurrencyLimit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
}

async function main() {
    console.log("=== STARTING PARALLEL SEEDING WITH CONCURRENCY ===");

    const userDirectoryPath = path.join(__dirname, '..', '..', 'docs', 'User Directory.txt');
    if (!fs.existsSync(userDirectoryPath)) {
        console.error(`User directory file not found at ${userDirectoryPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(userDirectoryPath, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const students = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 3) {
            students.push({
                firstName: parts[0].trim(),
                lastName: parts[1].trim(),
                email: parts[2].trim().toLowerCase()
            });
        }
    }

    console.log(`Parsed ${students.length} students from User Directory.txt`);

    // Clean up any existing seeded users to allow re-runs
    const emails = students.map(s => s.email);
    const existingUsers = await prisma.user.findMany({
        where: { email: { in: emails } }
    });
    
    if (existingUsers.length > 0) {
        console.log(`Deleting ${existingUsers.length} existing matching users to reset data...`);
        await prisma.user.deleteMany({
            where: { email: { in: emails } }
        });
    }

    const dbPrograms = await prisma.program.findMany();
    if (dbPrograms.length === 0) {
        console.error("No programs found in the database. Please run seed.js or seed_new_programs.js first.");
        process.exit(1);
    }
    console.log(`Found ${dbPrograms.length} programs in the system.`);

    // Pre-hash password once to optimize performance
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync("password123", salt);

    const today = new Date();
    const currentYear = today.getFullYear();

    // Ensure ActiveSemesterWindows exist for the current year
    const firstSemesterWindow = await prisma.activeSemesterWindow.findFirst({
        where: { name: "1st Semester" }
    });
    if (!firstSemesterWindow) {
        await prisma.activeSemesterWindow.create({
            data: {
                name: "1st Semester",
                start_date: new Date(currentYear, 0, 1),
                end_date: new Date(currentYear, 5, 30, 23, 59, 59, 999),
                is_active: true
            }
        });
        console.log("Created 1st Semester ActiveSemesterWindow");
    }

    const secondSemesterWindow = await prisma.activeSemesterWindow.findFirst({
        where: { name: "2nd Semester" }
    });
    if (!secondSemesterWindow) {
        await prisma.activeSemesterWindow.create({
            data: {
                name: "2nd Semester",
                start_date: new Date(currentYear, 6, 1),
                end_date: new Date(currentYear, 11, 31, 23, 59, 59, 999),
                is_active: true
            }
        });
        console.log("Created 2nd Semester ActiveSemesterWindow");
    }

    let successCount = 0;

    // Map each student to a task function
    const tasks = students.map((s, index) => {
        return async () => {
            const program = dbPrograms[index % dbPrograms.length];
            const semester = (index % 2 === 0) ? 1 : 2; // Alternating 1st (Jan-Jun) and 2nd (Jul-Dec) semesters
            
            const levelAndCourses = await getValidLevelAndCourses(program.id, semester);
            if (!levelAndCourses) {
                console.warn(`Skipping student ${s.email}: no courses found for program ${program.name}`);
                return;
            }

            const { level, courses } = levelAndCourses;
            const userSelectedSemStr = semester === 1 ? '1st Semester' : '2nd Semester';

            try {
                // 1. Create User
                const user = await prisma.user.create({
                    data: {
                        name: `${s.firstName} ${s.lastName}`,
                        email: s.email,
                        password_hash: defaultPasswordHash,
                        onboarding_stage: "COMPLETE"
                    }
                });

                // 2. Create AcademicProfile
                const requiresCGPA = level > 100 || (level === 100 && semester === 2);
                const current_cgpa = requiresCGPA ? parseFloat((2.5 + Math.random() * 2.3).toFixed(2)) : null;
                const goals = ["Pass All", "Improve GPA", "First Class"];
                const academic_goal = goals[index % goals.length];

                await prisma.academicProfile.create({
                    data: {
                        user_id: user.id,
                        program: program.name,
                        level: level,
                        semester: semester,
                        curriculum_type: "BMAS",
                        current_cgpa,
                        academic_goal
                    }
                });

                // 3. Create UserSelectedSemester
                await prisma.userSelectedSemester.create({
                    data: {
                        user_id: user.id,
                        semester: userSelectedSemStr
                    }
                });

                // 4. Create AcademicSession anchored to appropriate start/end dates
                let sessionStart, sessionEnd;
                if (semester === 1) {
                    sessionStart = new Date(currentYear, 0, 1); // Jan 1st 2026
                    sessionEnd = new Date(currentYear, 5, 30, 23, 59, 59, 999); // June 30th 2026
                } else {
                    sessionStart = new Date(currentYear, 6, 1); // July 1st 2026
                    sessionEnd = null; // Future/Active semester
                }

                await prisma.academicSession.create({
                    data: {
                        user_id: user.id,
                        semester: userSelectedSemStr,
                        level: level,
                        start_date: sessionStart,
                        end_date: sessionEnd
                    }
                });

                // 5. Create UserCourse records in bulk
                await prisma.userCourse.createMany({
                    data: courses.map(course => ({
                        user_id: user.id,
                        course_id: course.id,
                        is_selected: true,
                        is_completed: (semester === 1)
                    }))
                });

                // Retrieve created courses to obtain IDs
                const userCourses = await prisma.userCourse.findMany({
                    where: { user_id: user.id }
                });

                // 6. Create UserTopic records in bulk
                const courseIds = courses.map(c => c.id);
                const courseTopics = await prisma.courseTopic.findMany({
                    where: { course_id: { in: courseIds } }
                });

                const topicsToCreate = courseTopics.map(ct => ({
                    user_id: user.id,
                    course_id: ct.course_id,
                    course_topic_id: ct.id,
                    topic_name: ct.topic_name,
                    mastery_level: (semester === 1) ? parseFloat((0.65 + Math.random() * 0.3).toFixed(2)) : 0.0,
                    is_selected: true
                }));

                if (topicsToCreate.length === 0) {
                    for (const uc of userCourses) {
                        topicsToCreate.push({
                            user_id: user.id,
                            course_id: uc.course_id,
                            topic_name: 'General Study',
                            mastery_level: (semester === 1) ? parseFloat((0.65 + Math.random() * 0.3).toFixed(2)) : 0.0,
                            is_selected: true
                        });
                    }
                }
                
                await prisma.userTopic.createMany({
                    data: topicsToCreate
                });

                // 7. Create StudyAvailability slots in bulk
                const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                const numDays = 3 + Math.floor(Math.random() * 3);
                const shuffledDays = daysOfWeek.sort(() => 0.5 - Math.random()).slice(0, numDays);

                const availabilitiesToCreate = shuffledDays.map(day => {
                    const startHour = 9 + Math.floor(Math.random() * 8); // 09:00 to 17:00
                    return {
                        user_id: user.id,
                        day_of_week: day,
                        start_time: `${String(startHour).padStart(2, '0')}:00`,
                        end_time: `${String(startHour + 2).padStart(2, '0')}:00`
                    };
                });
                
                await prisma.studyAvailability.createMany({
                    data: availabilitiesToCreate
                });

                // 8. Generate study plans and sessions using application engine
                await generateStudyPlan(user.id, true, true);

                // 9. For the Jan-Jun cohort (semester ended), complete sessions and build progress history
                if (semester === 1) {
                    const sessions = await prisma.studySession.findMany({
                        where: {
                            studyPlan: { user_id: user.id }
                        },
                        include: { topic: true }
                    });

                    if (sessions.length > 0) {
                        // Mark all study sessions as completed in bulk
                        await prisma.studySession.updateMany({
                            where: { id: { in: sessions.map(s => s.id) } },
                            data: { completed: true }
                        });

                        // Build ProgressLogs in bulk
                        const courseHoursMap = {};
                        for (const session of sessions) {
                            const courseId = session.topic.course_id;
                            if (!courseHoursMap[courseId]) {
                                courseHoursMap[courseId] = 0;
                            }
                            courseHoursMap[courseId] += session.allocated_hours;
                        }

                        const progressLogsToCreate = userCourses.map(uc => {
                            const loggedHours = courseHoursMap[uc.course_id] || 0;
                            const checklistComp = parseFloat((75 + Math.random() * 20).toFixed(2));
                            const consistency = parseFloat((0.85 + Math.random() * 0.15).toFixed(2));
                            return {
                                user_id: user.id,
                                user_course_id: uc.id,
                                study_hours_logged: loggedHours,
                                checklist_completion: checklistComp,
                                consistency_score: consistency
                            };
                        });

                        await prisma.progressLog.createMany({
                            data: progressLogsToCreate
                        });

                        // Calculate study streak walking backwards from June 29, 2026
                        const sessionsByDay = new Map();
                        for (const s of sessions) {
                            if (!s.session_date) continue;
                            const dStr = new Date(s.session_date).toISOString().split('T')[0];
                            if (!sessionsByDay.has(dStr)) sessionsByDay.set(dStr, []);
                            sessionsByDay.get(dStr).push(s);
                        }

                        let calculatedStreak = 0;
                        const todayStart = new Date("2026-06-29T00:00:00.000Z");
                        let currentDateWalker = new Date(todayStart);

                        // Today
                        const todayStr = currentDateWalker.toISOString().split('T')[0];
                        const todayS = sessionsByDay.get(todayStr);
                        if (todayS && todayS.length > 0) {
                            const allCompleted = todayS.every(s => s.completed);
                            if (allCompleted) calculatedStreak++;
                        }

                        currentDateWalker.setDate(currentDateWalker.getDate() - 1);

                        // Retro traversal
                        while (true) {
                            const dStr = currentDateWalker.toISOString().split('T')[0];
                            const daySessions = sessionsByDay.get(dStr);

                            if (!daySessions || daySessions.length === 0) {
                                // Rest day
                            } else {
                                const allCompleted = daySessions.every(s => s.completed);
                                if (allCompleted) {
                                    calculatedStreak++;
                                } else {
                                    break;
                                }
                            }

                            currentDateWalker.setDate(currentDateWalker.getDate() - 1);
                            const diffDays = Math.floor((todayStart - currentDateWalker) / (1000 * 60 * 60 * 24));
                            if (diffDays > 365) break; 
                        }

                        // Update User record with streak count and last updated date
                        const sortedSessions = sessions.filter(s => s.session_date).sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
                        const lastUpdatedDate = sortedSessions.length > 0 ? sortedSessions[0].session_date : todayStart;

                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                streak_count: calculatedStreak,
                                streak_last_updated: lastUpdatedDate
                            }
                        });
                    }
                }

                successCount++;
                console.log(`[Seeded ${successCount}/100] ${s.email} | Program: ${program.name} | Level: ${level} | Semester: ${userSelectedSemStr}`);

            } catch (err) {
                console.error(`Failed to seed student ${s.email}:`, err);
            }
        };
    });

    // Run parallel seeding with a concurrency limit of 8
    await runWithConcurrency(tasks, 8);

    console.log(`=== SEEDING COMPLETED: Successfully seeded ${successCount} out of ${students.length} students ===`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
