const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
    const user = await prisma.user.findUnique({ where: { id: user_id } });
    console.log("Current built-in streak_count:", user.streak_count);
    console.log("streak_last_updated:", user.streak_last_updated);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
