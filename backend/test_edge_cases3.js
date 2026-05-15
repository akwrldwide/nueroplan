const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateStudyPlan } = require('./src/services/allocationEngine');

async function run() {
    const users = await prisma.user.findMany();
    let kevinId = users[0].id;
    
    // Clear existing availabilities
    await prisma.studyAvailability.deleteMany({ where: { user_id: kevinId } });
    
    // Add only Monday availability
    await prisma.studyAvailability.create({
        data: {
            user_id: kevinId,
            day_of_week: 'Mon',
            start_time: '10:00',
            end_time: '12:00'
        }
    });

    console.log("Testing plan generation with only Monday availability on a Friday");
    try {
        const plan = await generateStudyPlan(kevinId, true, false);
        console.log("Plan generated successfully:", plan.sessionsCreated, "sessions created");
    } catch (error) {
        console.error("Error generating plan:", error);
    }
}

run().then(() => prisma.$disconnect());
