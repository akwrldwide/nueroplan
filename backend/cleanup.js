const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log("Starting cleanup...");
    
    // Find today midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Delete any uncompleted study sessions that are in the past
    // BUT were generated AFTER today midnight.
    // Wait, the plan generated date is in study_plan.
    // Let's just find the plans generated today.
    const recentPlans = await prisma.studyPlan.findMany({
        where: {
            generated_date: { gte: today }
        }
    });

    for (const plan of recentPlans) {
        const deleted = await prisma.studySession.deleteMany({
            where: {
                study_plan_id: plan.id,
                session_date: { lt: today }
            }
        });
        console.log(`Deleted ${deleted.count} past sessions from recent plan ${plan.id}`);
    }

    // Wait, what if the user wants SEN101 back but Plan A's uncompleted sessions were deleted?
    // Plan A's uncompleted sessions for SEN101 were NEVER deleted because userTopicIds only included SEN103 during the recalculate!
    // Let's verify if SEN101 sessions exist.
    const allSessions = await prisma.studySession.findMany({
        where: { session_date: { lt: today } },
        include: { topic: { include: { course: true } } }
    });
    const sen101 = allSessions.filter(s => s.topic.course.code === 'SEN101');
    const sen103 = allSessions.filter(s => s.topic.course.code === 'SEN103');
    console.log(`Remaining past sessions: SEN101: ${sen101.length}, SEN103: ${sen103.length}`);
}

cleanup()
    .then(() => console.log("Done"))
    .catch(console.error)
    .finally(() => prisma.$disconnect());
