const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const currentPlan = await prisma.studyPlan.findFirst({
        where: { user_id },
        orderBy: { generated_date: 'desc' }
    });

    let allPastSessions = await prisma.studySession.findMany({
        where: {
            topic: { user_id },
            session_date: { lte: new Date() }
        },
        include: { studyPlan: true }
    });

    const dateStrMaxPlanDate = new Map();
    for (const s of allPastSessions) {
        if (!s.session_date) continue;
        const dStr = new Date(s.session_date).toISOString().split('T')[0];
        const cMax = dateStrMaxPlanDate.get(dStr) || new Date(0);
        const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
        if (sPlanDate > cMax) {
            dateStrMaxPlanDate.set(dStr, sPlanDate);
        }
    }

    allPastSessions = allPastSessions.filter(s => {
        if (!s.session_date) return false;
        if (currentPlan && s.study_plan_id === currentPlan.id) return true;
        if (s.completed) return true;
        const dStr = new Date(s.session_date).toISOString().split('T')[0];
        const maxPlanDate = dateStrMaxPlanDate.get(dStr);
        const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
        if (sPlanDate.getTime() === maxPlanDate?.getTime()) return true;
        return false;
    });

    const sessionsByDay = new Map();
    for (const s of allPastSessions) {
        const dStr = new Date(s.session_date).toISOString().split('T')[0];
        if (!sessionsByDay.has(dStr)) sessionsByDay.set(dStr, []);
        sessionsByDay.get(dStr).push(s);
    }

    let calculatedStreak = 0;
    let currentDateWalker = new Date(todayStart);

    // Check today
    const todayStr = currentDateWalker.toISOString().split('T')[0];
    const todayS = sessionsByDay.get(todayStr);
    if (todayS && todayS.length > 0) {
        const allCompleted = todayS.every(s => s.completed);
        if (allCompleted) calculatedStreak++;
    }

    currentDateWalker.setDate(currentDateWalker.getDate() - 1); // step to yesterday

    while (true) {
        const dStr = currentDateWalker.toISOString().split('T')[0];
        const daySessions = sessionsByDay.get(dStr);

        if (!daySessions || daySessions.length === 0) {
            // Rest day!
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

    console.log("Calculated Streak is:", calculatedStreak);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
