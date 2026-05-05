const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log("Migrating missing AcademicSessions...");
    const profiles = await prisma.academicProfile.findMany();
    
    for (const profile of profiles) {
        const existingSession = await prisma.academicSession.findFirst({
            where: { user_id: profile.user_id }
        });
        
        if (!existingSession) {
            const currentYear = new Date().getFullYear();
            let startDate, endDate;
            const semInt = profile.semester ? parseInt(profile.semester) : 1;
            
            if (semInt === 1) {
                startDate = new Date(currentYear, 0, 1);
                endDate = new Date(currentYear, 5, 30);
            } else {
                startDate = new Date(currentYear, 6, 1);
                endDate = new Date(currentYear, 11, 31);
            }

            const sessionName = `${currentYear} Session ${semInt}`;

            await prisma.academicSession.create({
                data: {
                    user_id: profile.user_id,
                    name: sessionName,
                    start_date: startDate,
                    end_date: endDate
                }
            });
            console.log(`Created session for user ${profile.user_id}`);
        }
    }
    console.log("Migration complete.");
}

migrate().finally(() => prisma.$disconnect());
