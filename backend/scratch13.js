const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
    
    const user = await prisma.user.findUnique({ where: { id: user_id } });
    console.log("Current streak:", user.streak_count, "Last updated:", user.streak_last_updated);

    const currentPlan = await prisma.studyPlan.findFirst({
        where: { user_id },
        orderBy: { generated_date: 'desc' }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let streakReset = false;

    // We only need to check if they have a streak > 0
    if (user.streak_count > 0 && user.streak_last_updated) {
        const lastUpdatedDateStr = new Date(user.streak_last_updated).toISOString().split('T')[0];
        const todayDateStr = todayStart.toISOString().split('T')[0];

        if (lastUpdatedDateStr < todayDateStr) {
            // Find all sessions between the day after streak_last_updated and yesterday (inclusive)
            const checkStart = new Date(user.streak_last_updated);
            checkStart.setDate(checkStart.getDate() + 1);
            checkStart.setHours(0, 0, 0, 0);

            const checkEnd = new Date(todayStart);
            checkEnd.setDate(checkEnd.getDate() - 1);
            checkEnd.setHours(23, 59, 59, 999);

            if (checkStart <= checkEnd) {
                let pastSessions = await prisma.studySession.findMany({
                    where: {
                        topic: { user_id },
                        session_date: {
                            gte: checkStart,
                            lte: checkEnd
                        }
                    },
                    include: { studyPlan: true }
                });

                // Deduplicate
                const dateStrUncompletedMaxPlanDate = new Map();
                for (const s of pastSessions) {
                    if (!s.session_date || s.completed) continue;
                    const dStr = new Date(s.session_date).toISOString().split('T')[0];
                    const cMax = dateStrUncompletedMaxPlanDate.get(dStr) || new Date(0);
                    const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
                    if (sPlanDate > cMax) {
                        dateStrUncompletedMaxPlanDate.set(dStr, sPlanDate);
                    }
                }

                pastSessions = pastSessions.filter(s => {
                    if (!s.session_date) return false;
                    if (currentPlan && s.study_plan_id === currentPlan.id) return true;
                    if (s.completed) return true;

                    const dStr = new Date(s.session_date).toISOString().split('T')[0];
                    const maxPlanDate = dateStrUncompletedMaxPlanDate.get(dStr);
                    const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);

                    if (sPlanDate.getTime() === maxPlanDate?.getTime()) {
                        return true;
                    }
                    return false;
                });

                // Are there any uncompleted sessions in this timeframe?
                const uncompleted = pastSessions.some(s => !s.completed);
                if (uncompleted) {
                    streakReset = true;
                    console.log("Streak should be reset! Found uncompleted sessions between", checkStart, "and", checkEnd);
                } else {
                    console.log("No uncompleted sessions found in the gap. Streak is safe.");
                }
            } else {
                 console.log("checkStart", checkStart, "is > checkEnd", checkEnd, "so gap is empty (e.g. today or yesterday). Wait, if last_update was yesterday, checkStart=today, checkEnd=yesterday. So gap is empty. Safe.");
            }
        }
    }

    if (!streakReset && user.streak_count > 0 && !user.streak_last_updated) {
        // Fallback: If no last_updated but streak > 0, we can just check if yesterday had uncompleted sessions.
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0,0,0,0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23,59,59,999);
        
        let yesterdaySessions = await prisma.studySession.findMany({
            where: {
                topic: { user_id },
                session_date: {
                    gte: yesterday,
                    lte: yesterdayEnd
                }
            },
            include: { studyPlan: true }
        });
        
        // Deduplicate
        const dateStrUncompletedMaxPlanDate = new Map();
        for (const s of yesterdaySessions) {
            if (!s.session_date || s.completed) continue;
            const dStr = new Date(s.session_date).toISOString().split('T')[0];
            const cMax = dateStrUncompletedMaxPlanDate.get(dStr) || new Date(0);
            const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
            if (sPlanDate > cMax) {
                dateStrUncompletedMaxPlanDate.set(dStr, sPlanDate);
            }
        }

        yesterdaySessions = yesterdaySessions.filter(s => {
            if (!s.session_date) return false;
            if (currentPlan && s.study_plan_id === currentPlan.id) return true;
            if (s.completed) return true;
            const dStr = new Date(s.session_date).toISOString().split('T')[0];
            const maxPlanDate = dateStrUncompletedMaxPlanDate.get(dStr);
            const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
            if (sPlanDate.getTime() === maxPlanDate?.getTime()) return true;
            return false;
        });

        const uncompleted = yesterdaySessions.some(s => !s.completed);
        if (uncompleted) {
            console.log("Fallback reset triggered. Uncompleted found yesterday.");
            streakReset = true;
        }
    }

    console.log("FINAL STREAK RESET EVALUATION:", streakReset);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
