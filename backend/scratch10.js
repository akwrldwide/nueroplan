const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
    const plan = await prisma.studyPlan.findFirst({
        where: { user_id },
        orderBy: { generated_date: 'desc' }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let allSessions = await prisma.studySession.findMany({
        where: { 
            topic: { user_id },
            OR: [
                { study_plan_id: plan.id },
                { session_date: { lt: todayStart } }
            ]
        },
        include: {
            studyPlan: true
        }
    });

    const dateStrUncompletedMaxPlanDate = new Map();

    for (const session of allSessions) {
        if (!session.session_date || session.completed) continue;
        const dateStr = new Date(session.session_date).toISOString().split('T')[0];
        
        const currentMax = dateStrUncompletedMaxPlanDate.get(dateStr) || new Date(0);
        const sessionPlanDate = new Date(session.studyPlan.generated_date);
        
        if (sessionPlanDate > currentMax) {
            dateStrUncompletedMaxPlanDate.set(dateStr, sessionPlanDate);
        }
    }

    allSessions = allSessions.filter(session => {
        if (!session.session_date) return false;
        if (session.completed) return true;
        
        // Always keep sessions from the absolute current plan
        if (session.study_plan_id === plan.id) return true;

        const dateStr = new Date(session.session_date).toISOString().split('T')[0];
        const maxPlanDate = dateStrUncompletedMaxPlanDate.get(dateStr);
        const sessionPlanDate = new Date(session.studyPlan.generated_date);

        // Keep only uncompleted legacy sessions from the most recent plan that targeted this day
        if (sessionPlanDate.getTime() === maxPlanDate.getTime()) {
            return true;
        }

        return false;
    });

    allSessions.sort((a, b) => {
        const dateA = new Date(a.session_date).getTime();
        const dateB = new Date(b.session_date).getTime();
        if (dateA !== dateB) return dateA - dateB;

        const timeA = a.start_time.split(':').map(Number);
        const timeB = b.start_time.split(':').map(Number);
        if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
        return timeA[1] - timeB[1];
    });

    const april7 = allSessions.filter(s => new Date(s.session_date).toISOString().split('T')[0] === '2026-04-07');
    console.log(`April 7 sessions: ${april7.length}`);
    april7.forEach(s => console.log(`${s.start_time}-${s.end_time} completed:${s.completed} planDate:${s.studyPlan.generated_date}`));
}

main().catch(console.error).finally(()=>prisma.$disconnect());
