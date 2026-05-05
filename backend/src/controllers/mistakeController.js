const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createMistake = async (req, res) => {
    try {
        const userId = req.user.id;
        const { user_topic_id, topic_id, question, correct_answer, given_answer } = req.body;
        const finalTopicId = user_topic_id || topic_id;

        if (!finalTopicId) {
            return res.status(400).json({ error: 'Missing topic ID' });
        }

        const mistake = await prisma.mistakeLog.create({
            data: {
                user_id: userId,
                user_topic_id: finalTopicId,
                question,
                correct_answer,
                given_answer
            }
        });

        // Dynamic Weakness adjustment logic:
        // Automatically downgrade mastery to 'weak' if they make >= 3 mistakes on this topic within the last week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentMistakesCount = await prisma.mistakeLog.count({
            where: {
                user_topic_id: finalTopicId,
                created_at: { gte: oneWeekAgo }
            }
        });

        if (recentMistakesCount >= 3) {
            await prisma.userTopic.update({
                where: { id: finalTopicId },
                data: { mastery_level: 0.1 }
            });
        }

        res.status(201).json(mistake);
    } catch (error) {
        console.error('Error logging mistake:', error);
        res.status(500).json({ error: 'Failed to log mistake' });
    }
};

exports.getMistakes = async (req, res) => {
    try {
        const userId = req.user.id;
        const mistakes = await prisma.mistakeLog.findMany({
            where: { user_id: userId },
            include: {
                userTopic: {
                    include: { course: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(mistakes);
    } catch (error) {
        console.error('Error fetching mistakes:', error);
        res.status(500).json({ error: 'Failed to fetch mistakes' });
    }
};
