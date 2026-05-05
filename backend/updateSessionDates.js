const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
    const sessions = await prisma.academicSession.findMany();
    for (const s of sessions) {
        if (s.name.includes("Session 1")) {
            await prisma.academicSession.update({
                where: { id: s.id },
                data: {
                    start_date: new Date(2026, 0, 5), // Jan 5, 2026
                    end_date: new Date(2026, 4, 31)   // May 31, 2026
                }
            });
        }
    }
    console.log("Updated active session to exactly match Jan 5 - May 31, 2026.");
}
update().finally(() => prisma.$disconnect());
