const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAvailability = async (req, res) => {
    try {
        const availability = await prisma.studyAvailability.findMany({
            where: { user_id: req.user.id },
            orderBy: { day_of_week: 'asc' } // You might want custom sorting for days
        });
        res.json(availability);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching availability' });
    }
};

const saveAvailability = async (req, res) => {
    try {
        const { availabilities } = req.body; // Array of { day_of_week, start_time, end_time }
        const user_id = req.user.id;

        // Clear existing for user
        await prisma.studyAvailability.deleteMany({
            where: { user_id }
        });

        const dataToSave = availabilities.map(a => ({
            user_id,
            day_of_week: a.day_of_week,
            start_time: a.start_time,
            end_time: a.end_time
        }));

        const saved = await prisma.studyAvailability.createMany({
            data: dataToSave
        });

        // Advance Onboarding Stage
        await prisma.user.update({
            where: { id: user_id },
            data: { onboarding_stage: 'COMPLETE' }
        });

        res.status(201).json({ message: 'Availability saved', count: saved.count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error saving availability' });
    }
};

module.exports = { getAvailability, saveAvailability };
