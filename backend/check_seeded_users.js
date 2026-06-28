const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            include: {
                academicProfile: true,
                _count: {
                    select: {
                        userCourses: true,
                        studyPlans: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        console.log(`=== USERS IN SYSTEM (Count: ${users.length}) ===`);
        for (const u of users) {
            console.log(`Email: ${u.email} | Name: ${u.name} | Stage: ${u.onboarding_stage} | Program: ${u.academicProfile?.program || 'N/A'} | Level: ${u.academicProfile?.level || 'N/A'} | Sem: ${u.academicProfile?.semester || 'N/A'} | Courses: ${u._count.userCourses} | Plans: ${u._count.studyPlans}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
