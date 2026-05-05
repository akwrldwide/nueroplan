const { PrismaClient } = require('@prisma/client');
const { generateStudyPlan } = require('./src/services/allocationEngine');
const prisma = new PrismaClient();

async function run() {
    console.log("Wiping all study sessions...");
    await prisma.studySession.deleteMany({});
    console.log("Wiped.");

    const users = await prisma.user.findMany();
    for (const u of users) {
        console.log(`Generating study plan for user: ${u.email}`);
        try {
            await generateStudyPlan(u.id, true, true);
            console.log("Success.");
        } catch (e) {
            console.error("Error generating for", u.email, e);
        }
    }
}

run().finally(() => prisma.$disconnect());
