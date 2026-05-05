const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
    
    // Get the most recent active plan (like planRoutes.js might have as anchor)
    const plan = await prisma.studyPlan.findFirst({
        where: { user_id },
        orderBy: { generated_date: 'desc' }
    });

    const academicSessions = await prisma.academicSession.findMany({
        where: { user_id },
        orderBy: { start_date: 'desc' }
    });

    const timeline = [];
    for (const session of academicSessions) {
        let studySessions = await prisma.studySession.findMany({
            where: {
                topic: { user_id },
                session_date: {
                    gte: session.start_date,
                    lte: session.end_date
                }
            },
            include: { 
                topic: { include: { course: true } },
                studyPlan: true
            }
        });

        const dateStrUncompletedMaxPlanDate = new Map();

        for (const s of studySessions) {
            if (!s.session_date || s.completed) continue;
            const dateStr = new Date(s.session_date).toISOString().split('T')[0];
            
            const currentMax = dateStrUncompletedMaxPlanDate.get(dateStr) || new Date(0);
            const sessionPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
            
            if (sessionPlanDate > currentMax) {
                dateStrUncompletedMaxPlanDate.set(dateStr, sessionPlanDate);
            }
        }

        studySessions = studySessions.filter(s => {
            if (!s.session_date) return false;
            if (plan && s.study_plan_id === plan.id) return true;
            if (s.completed) return true;

            const dateStr = new Date(s.session_date).toISOString().split('T')[0];
            const maxPlanDate = dateStrUncompletedMaxPlanDate.get(dateStr);
            const sessionPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);

            if (sessionPlanDate.getTime() === maxPlanDate?.getTime()) {
                return true;
            }

            return false;
        });

        const completedSessions = studySessions.filter(s => s.completed);

        timeline.push({
            session_name: session.name,
            start_date: session.start_date,
            end_date: session.end_date,
            completed_sessions_count: completedSessions.length,
            total_sessions_count: studySessions.length
        });
    }

    console.log(timeline);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
