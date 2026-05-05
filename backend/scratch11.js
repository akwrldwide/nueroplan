const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
    
    const academicSessions = await prisma.academicSession.findMany({
        where: { user_id },
        orderBy: { start_date: 'desc' }
    });

    const timeline = [];
    for (const session of academicSessions) {
        const studySessions = await prisma.studySession.findMany({
            where: {
                topic: { user_id },
                session_date: {
                    gte: session.start_date,
                    lte: session.end_date
                }
            },
            include: { topic: { include: { course: true } } }
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
