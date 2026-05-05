const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
    let allPastSessions = await prisma.studySession.findMany({
        where: {
            topic: { user_id },
        },
        take: 3,
        orderBy: { session_date: 'desc' }
    });
    for (const s of allPastSessions) {
        console.log("session_date:", s.session_date, "toISOString:", s.session_date.toISOString());
    }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
