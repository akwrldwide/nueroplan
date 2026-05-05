const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const sessions = await prisma.academicSession.findMany();
    console.log("Academic sessions:", sessions);
}

check().finally(() => prisma.$disconnect());
