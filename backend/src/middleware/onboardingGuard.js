const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const onboardingGuard = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { onboarding_stage: true }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (user.onboarding_stage !== 'COMPLETE') {
            return res.status(403).json({ message: 'Onboarding incomplete', stage: user.onboarding_stage });
        }

        next();
    } catch (error) {
        console.error('Error in onboarding guard:', error);
        res.status(500).json({ message: 'Server error during onboarding check' });
    }
};

module.exports = onboardingGuard;
