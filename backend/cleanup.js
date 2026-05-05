const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDupes() {
    const sessions = await prisma.studySession.findMany({
        orderBy: { study_plan_id: 'desc' }, // Keep latest study plan sessions prioritizing them
        include: { topic: true }
    });

    let toDelete = [];
    let seen = new Set();
    
    for (const s of sessions) {
        if (!s.session_date) {
            toDelete.push(s.id);
            continue;
        }

        const dateStr = s.session_date.toISOString().split('T')[0];
        const key = `${dateStr}_${s.start_time}_${s.day_of_week}_${s.topic.course_id}_${s.topic.id}`;
        
        if (seen.has(key)) {
            if (!s.completed) {
                // Never delete completed sessions as duplicates, preferentially delete the uncompleted counterpart if both exist,
                // Wait! If they are both uncompleted, delete the second.
                toDelete.push(s.id);
            }
        } else {
            seen.add(key);
        }
    }
    
    console.log(toDelete.length, 'duplicates found');
    await prisma.studySession.deleteMany({
        where: { id: { in: toDelete } }
    });
    console.log('Deleted successfully');
}
removeDupes().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
