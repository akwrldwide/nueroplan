const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateStudyPlan } = require('./src/services/allocationEngine');

async function test() {
    try {
        const plan = await prisma.studyPlan.findFirst({
            orderBy: { generated_date: 'desc' },
            include: { user: true }
        });
        if (!plan) {
            console.log("No recent study plan found");
            return;
        }
        const user = plan.user;
        console.log("Testing generateStudyPlan for user:", user.id);
        const newPlan = await generateStudyPlan(user.id, true, false);
        console.log("Success! Sessions generated:", newPlan.sessionsCreated);
    } catch (e) {
        console.error("Error generating plan:");
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
