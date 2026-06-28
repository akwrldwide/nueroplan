const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const usersCount = await prisma.user.count();
        const profilesCount = await prisma.academicProfile.count();
        const userCoursesCount = await prisma.userCourse.count();
        const plansCount = await prisma.studyPlan.count();
        const sessionsCount = await prisma.studySession.count();
        const completedSessionsCount = await prisma.studySession.count({ where: { completed: true } });

        console.log(`=== DB STATS ===`);
        console.log(`Total Users: ${usersCount}`);
        console.log(`Academic Profiles: ${profilesCount}`);
        console.log(`User Courses: ${userCoursesCount}`);
        console.log(`Study Plans: ${plansCount}`);
        console.log(`Study Sessions: ${sessionsCount} (${completedSessionsCount} completed)`);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
