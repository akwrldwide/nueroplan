const fs = require('fs');
const path = require('path');

// Dynamically override connection limit in DATABASE_URL for higher concurrency
if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('connection_limit=1', 'connection_limit=10');
} else {
    require('dotenv').config();
    if (process.env.DATABASE_URL) {
        process.env.DATABASE_URL = process.env.DATABASE_URL.replace('connection_limit=1', 'connection_limit=10');
    }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateStudyPlan } = require('./src/services/allocationEngine');

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
    console.log("=== STARTING PARALLEL REPAIR FOR JAN-JUN COHORT ===");

    const userDirectoryPath = path.join(__dirname, '..', '..', 'docs', 'User Directory.txt');
    if (!fs.existsSync(userDirectoryPath)) {
        console.error(`User directory file not found at ${userDirectoryPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(userDirectoryPath, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const emails = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 3) {
            emails.push(parts[2].trim().toLowerCase());
        }
    }

    const users = await prisma.user.findMany({
        where: { email: { in: emails } },
        include: { academicProfile: true }
    });

    // Filter to Jan-Jun users (1st Semester)
    const janJunUsers = users.filter(u => u.academicProfile && u.academicProfile.semester === 1);
    console.log(`Found ${janJunUsers.length} Jan-Jun cohort users requiring repair.`);

    let successCount = 0;

    const tasks = janJunUsers.map((user, index) => {
        return async () => {
            try {
                // 1. Temporarily mark courses as uncompleted so the allocation engine generates plans
                await prisma.userCourse.updateMany({
                    where: { user_id: user.id },
                    data: { is_completed: false }
                });

                // 2. Generate study plan and sessions
                await generateStudyPlan(user.id, true, true);

                // 3. Mark courses back as completed (since their semester has ended)
                await prisma.userCourse.updateMany({
                    where: { user_id: user.id },
                    data: { is_completed: true }
                });

                // 4. Fetch the generated sessions
                const sessions = await prisma.studySession.findMany({
                    where: {
                        studyPlan: { user_id: user.id }
                    },
                    include: { topic: true }
                });

                if (sessions.length > 0) {
                    // 5. Complete all sessions
                    await prisma.studySession.updateMany({
                        where: { id: { in: sessions.map(s => s.id) } },
                        data: { completed: true }
                    });

                    // 6. Delete old progress logs
                    await prisma.progressLog.deleteMany({
                        where: { user_id: user.id }
                    });

                    // 7. Create progress logs based on actual session allocations
                    const courseHoursMap = {};
                    for (const session of sessions) {
                        const courseId = session.topic.course_id;
                        if (!courseHoursMap[courseId]) {
                            courseHoursMap[courseId] = 0;
                        }
                        courseHoursMap[courseId] += session.allocated_hours;
                    }

                    const userCourses = await prisma.userCourse.findMany({
                        where: { user_id: user.id }
                    });

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

                    // 8. Calculate dynamic streak count walking backwards from June 29, 2026
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

                successCount++;
                console.log(`[Repaired ${successCount}/${janJunUsers.length}] ${user.email} | Streak: ${user.streak_count} -> updated | Sessions: ${sessions.length}`);
            } catch (err) {
                console.error(`Failed to repair student ${user.email}:`, err);
            }
        };
    });

    await runWithConcurrency(tasks, 8);
    console.log(`=== REPAIR COMPLETED: Successfully repaired ${successCount}/${janJunUsers.length} Jan-Jun cohort users ===`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
