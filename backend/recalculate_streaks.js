const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== RECALCULATING STREAKS FOR JAN-JUN COHORT ===");

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

    const janJunUsers = users.filter(u => u.academicProfile && u.academicProfile.semester === 1);
    console.log(`Found ${janJunUsers.length} Jan-Jun users to update.`);

    let updateCount = 0;

    for (const user of janJunUsers) {
        const sessions = await prisma.studySession.findMany({
            where: {
                studyPlan: { user_id: user.id }
            }
        });

        if (sessions.length > 0) {
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

            // Walk backwards
            while (true) {
                const dStr = currentDateWalker.toISOString().split('T')[0];
                const daySessions = sessionsByDay.get(dStr);

                if (!daySessions || daySessions.length === 0) {
                    // Rest day - skip without breaking streak
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

            // Update user record
            const sortedSessions = sessions.filter(s => s.session_date).sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
            const lastUpdatedDate = sortedSessions.length > 0 ? sortedSessions[0].session_date : todayStart;

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    streak_count: calculatedStreak,
                    streak_last_updated: lastUpdatedDate
                }
            });

            updateCount++;
        }
    }

    console.log(`=== RECALCULATION COMPLETED: Successfully updated ${updateCount}/${janJunUsers.length} users ===`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
