const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
    try {
        const deletedEDU = await prisma.curriculum.deleteMany({
            where: { course_code: { startsWith: 'EDU' } }
        });
        console.log('Deleted EDU courses:', deletedEDU.count);

        const deletedGST111 = await prisma.curriculum.deleteMany({
            where: { course_code: 'GST111' }
        });
        console.log('Deleted GST111 courses:', deletedGST111.count);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

clean();
