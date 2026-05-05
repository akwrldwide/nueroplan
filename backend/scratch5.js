const allocationEngine = require('./src/services/allocationEngine');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const originalDate = global.Date;
    global.Date = class extends originalDate {
        constructor(...args) {
            if (args.length === 0) {
                super('2026-04-10T12:00:00Z');
            } else {
                super(...args);
            }
        }
    };
    global.Date.now = () => new originalDate('2026-04-10T12:00:00Z').getTime();

    try {
        const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
        console.log("Generating plan with today=April 10...");
        const plan = await allocationEngine.generateStudyPlan(user_id, false, false);
        
        const sessions = await prisma.studySession.findMany({
            where: { study_plan_id: plan.id }
        });
        
        const april6to8 = sessions.filter(s => s.session_date >= new originalDate('2026-04-06T00:00:00Z') && s.session_date < new originalDate('2026-04-09T00:00:00Z'));
        console.log(`Sessions from April 6 to 8:`, april6to8.length);
        if (april6to8.length > 0) {
            console.log(april6to8.slice(0, 2));
        }
    } finally {
        global.Date = originalDate;
        await prisma.$disconnect();
    }
}

main().catch(console.error);
