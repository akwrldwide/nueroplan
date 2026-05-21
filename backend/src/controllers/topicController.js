const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getUserTopics = async (req, res) => {
    try {
        const userId = req.user.id;
        const topics = await prisma.userTopic.findMany({
            where: { user_id: userId, is_archived: false },
            include: { course: true }
        });
        res.json(topics);
    } catch (error) {
        console.error('Error fetching topics:', error);
        res.status(500).json({ error: 'Failed to fetch topics' });
    }
};

exports.saveUserTopics = async (req, res) => {
    try {
        const userId = req.user.id;
        const { topics } = req.body; 
        
        const activeCourses = await prisma.userCourse.findMany({
            where: { user_id: userId, is_archived: false }
        });
        
        const providedCourseIds = new Set(topics.map(t => t.course_id));
        let topicsToSave = [...topics];

        activeCourses.forEach(c => {
            if (!providedCourseIds.has(c.course_id)) {
                topicsToSave.push({
                    course_id: c.course_id,
                    topic_name: 'General Study',
                    course_topic_id: null
                });
            }
        });

        await prisma.userTopic.deleteMany({ where: { user_id: userId } });

        const savedTopics = await prisma.$transaction(
            topicsToSave.map(t => 
                prisma.userTopic.create({
                    data: {
                        user_id: userId,
                        course_id: t.course_id,
                        course_topic_id: t.course_topic_id || null,
                        topic_name: t.topic_name,
                        mastery_level: 0,
                        is_selected: true
                    }
                })
            )
        );

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const nextStage = user ? (user.onboarding_stage === 'COMPLETE' ? 'COMPLETE' : 'AVAILABILITY') : 'AVAILABILITY';

        await prisma.user.update({
            where: { id: userId },
            data: { onboarding_stage: nextStage }
        });

        res.status(201).json({ message: 'Topics saved successfully', count: savedTopics.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save topics' });
    }
};

exports.createTopic = async (req, res) => {
    try {
        const userId = req.user.id;
        const { course_id, topic_name } = req.body;

        const topic = await prisma.userTopic.create({
            data: {
                user_id: userId,
                course_id,
                topic_name,
                mastery_level: 0,
                is_selected: true
            }
        });

        res.status(201).json(topic);
    } catch (error) {
        console.error('Error creating topic:', error);
        res.status(500).json({ error: 'Failed to create custom topic' });
    }
};

exports.updateTopic = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { topic_name, mastery_level, is_selected } = req.body;

        const topic = await prisma.userTopic.findFirst({
            where: { id, user_id: userId, is_archived: false }
        });

        if (!topic) return res.status(404).json({ error: 'Topic not found' });

        const updatedTopic = await prisma.userTopic.update({
            where: { id },
            data: {
                ...(topic_name && { topic_name }),
                ...(mastery_level !== undefined && { mastery_level: parseFloat(mastery_level) }),
                ...(is_selected !== undefined && { is_selected })
            }
        });

        res.json(updatedTopic);
    } catch (error) {
        console.error('Error updating topic:', error);
        res.status(500).json({ error: 'Failed to update topic' });
    }
};

exports.deleteTopic = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const topic = await prisma.userTopic.findFirst({
            where: { id, user_id: userId, is_archived: false }
        });

        if (!topic) return res.status(404).json({ error: 'Topic not found' });

        await prisma.userTopic.delete({ where: { id } });

        res.json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ error: 'Failed to delete topic' });
    }
};
