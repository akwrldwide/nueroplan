const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { calculateTopicPriority } = require('../services/priorityEngine');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const getMotivation = async (req, res) => {
    try {
        const user_id = req.user.id;
        // Neuro Insight deactivated per requirement
        // Ensures no Google Gemini API calls are made in the background
        const insight = "Neuro Insight deactivated.";

        res.status(200).json({ insight });
    } catch (error) {
        console.error("Error generating AI motivation:", error);
        res.status(500).json({ error: 'Failed to generate AI motivation' });
    }
};

module.exports = { getMotivation };
