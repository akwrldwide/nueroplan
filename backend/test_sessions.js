const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSessions() {
    const sessions = await prisma.studySession.findMany({
        orderBy: { session_date: 'asc' }
    });
    
    console.log(`Total sessions: ${sessions.length}`);
    if (sessions.length > 0) {
        console.log(`First session date: ${sessions[0].session_date}`);
        console.log(`Last session date: ${sessions[sessions.length - 1].session_date}`);
        
        const march17 = sessions.filter(s => s.session_date && s.session_date.toISOString().includes('2026-03-17'));
        console.log(`Sessions on March 17: ${march17.length}`);
        if(march17.length > 0) {
           console.log("Sample March 17 session day_of_week:", march17[0].day_of_week);
        }
    }
}

checkSessions().finally(() => prisma.$disconnect());
