const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const sessions = await prisma.studySession.findMany({
        orderBy: { session_date: 'asc' },
        include: { topic: true }
    });
    
    let map = {};
    sessions.forEach(s => {
        let dateStr = s.session_date ? s.session_date.toISOString().split('T')[0] : 'null';
        let key = `${dateStr}_${s.start_time}_${s.day_of_week}_${s.topic.course_id}_${s.topic.id}`;
        map[key] = (map[key] || 0) + 1;
    });

    let duplicates = Object.entries(map).filter(([k, v]) => v > 1);
    console.log("Duplicates:", duplicates);
    console.log("Total sessions:", sessions.length);

    const plans = await prisma.studyPlan.findMany();
    console.log("Total Plans:", plans.map(p => p.id));
}
check().finally(() => prisma.$disconnect());
