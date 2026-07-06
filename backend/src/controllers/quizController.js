const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateStudyPlan } = require('../services/allocationEngine');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const getQuizQuestions = async (req, res) => {
    try {
        const { course_id } = req.params;
        const questions = await prisma.quizQuestion.findMany({
            where: { course_id },
            take: 20
        });
        res.json(questions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching questions' });
    }
};

const submitQuiz = async (req, res) => {
    try {
        const { course_id } = req.params;
        const { answers } = req.body; 

        const questions = await prisma.quizQuestion.findMany({
            where: { id: { in: Object.keys(answers) } }
        });

        let correctCount = 0;
        questions.forEach(q => {
            if (q.correct_answer === answers[q.id]) {
                correctCount++;
            }
        });

        const score_percentage = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

        const result = await prisma.quizResult.create({
            data: {
                user_id: req.user.id,
                course_id,
                score_percentage
            }
        });

        // Adaptive Learning Model: M_i(t+1) = M_i(t) + η(Q_i - M_i(t))
        const config = await prisma.systemConfig.findUnique({ where: { id: 'system_config' } });
        const eta = config ? config.learning_rate_eta : 0.2;
        const Q_i = score_percentage / 100;
        
        const topics = await prisma.userTopic.findMany({
            where: { user_id: req.user.id, course_id, is_archived: false }
        });
        
        for (const t of topics) {
            const M_t = t.mastery_level || 0;
            const M_next = M_t + eta * (Q_i - M_t);
            await prisma.userTopic.update({
                where: { id: t.id },
                data: { mastery_level: Math.max(0, Math.min(1, M_next)) }
            });
        }

        // Auto-recalculate plan
        try {
            await generateStudyPlan(req.user.id, true, false);
        } catch (planErr) {
            console.error("Error auto-regenerating plan on quiz submission:", planErr);
        }

        res.status(201).json({ message: 'Quiz submitted', result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error submitting quiz' });
    }
};

const generateQuiz = async (req, res) => {
    try {
        const { isWholeCourse, topics, course_name, amount, difficulty } = req.body;
        const userId = req.user.id;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Gemini API Key missing' });
        }
        
        let mistakeWhere = { user_id: userId, is_archived: false };
        if (!isWholeCourse && topics && topics.length > 0) {
            mistakeWhere.userTopic = { topic_name: { in: topics } };
        }

        const recentMistakes = await prisma.mistakeLog.findMany({
            where: mistakeWhere,
            take: 5,
            orderBy: { created_at: 'desc' }
        });

        const mistakesContext = recentMistakes.length > 0
            ? `\nFocus on these recent mistakes the user made:\n${recentMistakes.map(m => `- Q: ${m.question}\nCorrect: ${m.correct_answer}\nUser answered: ${m.given_answer}`).join('\n')}`
            : '';

        const rangeText = isWholeCourse ? "the entire syllabus" : `the following specific topics: ${topics?.join(', ')}`;
        const prompt = `Generate exactly ${amount || 5} multiple choice quiz questions covering ${rangeText} within the context of the course "${course_name || 'General'}" at college level. Difficulty out of 5: ${difficulty || 3}.
${mistakesContext}

Provide the output strictly as a JSON array where each object has EXACTLY these keys:
- "Topic": string (the topic name)
- "Difficulty": number (1-5)
- "Cognitive Level": string (e.g. Remember, Understand, Apply, Analyze, Evaluate, Create)
- "Question": string (the actual question text)
- "Options": array of 4 strings
- "Correct Answer": string (must exactly match one of the Options)
- "Explanation": string`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        let rawContent = result.response.text();

        rawContent = rawContent.replace(/^\`\`\`(?:json)?/i, '').replace(/\`\`\`$/i, '').trim();

        const questions = JSON.parse(rawContent);
        res.status(200).json({ questions });
    } catch (error) {
        console.error('Error generating AI quiz:', error);
        const tName = req.body.isWholeCourse ? "General Course Concepts" : (req.body.topics?.[0] || "General");
        const fallbackQuestions = Array.from({ length: req.body.amount || 5 }).map((_, i) => ({
            "Topic": tName,
            "Difficulty": req.body.difficulty || 3,
            "Cognitive Level": "Apply",
            "Question": `[Fallback Question]: What is a key principle of ${tName}? (AI limit reached or invalid response)`,
            "Options": ["Correct Principle", "Wrong Answer 1", "Wrong Answer 2", "Wrong Answer 3"],
            "Correct Answer": "Correct Principle",
            "Explanation": "This is a locally generated fallback question due to AI service unavailability or parse error."
        }));
        res.status(200).json({ questions: fallbackQuestions, isFallback: true });
    }
};

const saveAIQuizResult = async (req, res) => {
    try {
        const { course_id, score_percentage, topic_name, difficulty } = req.body;
        const result = await prisma.quizResult.create({
            data: {
                user_id: req.user.id,
                course_id,
                topic_name,
                difficulty,
                score_percentage
            }
        });

        // Adaptive Learning Model: M_i(t+1) = M_i(t) + η(Q_i - M_i(t))
        if (topic_name) {
            const userTopic = await prisma.userTopic.findFirst({
                where: { user_id: req.user.id, course_id, topic_name, is_archived: false }
            });

            if (userTopic) {
                const config = await prisma.systemConfig.findUnique({ where: { id: 'system_config' } });
                const eta = config ? config.learning_rate_eta : 0.2; // Adaptive Learning Rate
                const Q_i = score_percentage / 100;
                const M_t = userTopic.mastery_level || 0;
                const M_next = M_t + eta * (Q_i - M_t);

                await prisma.userTopic.update({
                    where: { id: userTopic.id },
                    data: { mastery_level: Math.max(0, Math.min(1, M_next)) }
                });
            }
        }

        // Auto-recalculate plan
        try {
            await generateStudyPlan(req.user.id, true, false);
        } catch (planErr) {
            console.error("Error auto-regenerating plan on AI quiz submission:", planErr);
        }

        res.status(201).json({ message: 'AI Quiz submitted', result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error saving AI quiz result' });
    }
};

const getQuizResults = async (req, res) => {
    try {
        const { course_id, time_range } = req.query;
        let dateFilter = {};
        
        if (time_range === '7d') {
            const date = new Date();
            date.setDate(date.getDate() - 7);
            dateFilter = { gte: date };
        } else if (time_range === '30d') {
            const date = new Date();
            date.setDate(date.getDate() - 30);
            dateFilter = { gte: date };
        }

        const whereClause = { user_id: req.user.id };
        if (course_id && course_id !== 'all') {
            whereClause.course_id = course_id;
        }
        if (Object.keys(dateFilter).length > 0) {
            whereClause.taken_at = dateFilter;
        }

        const results = await prisma.quizResult.findMany({
            where: whereClause,
            orderBy: { taken_at: 'desc' },
            include: { course: true }
        });
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching quiz results' });
    }
};

const getQuizTrackerInsights = async (req, res) => {
    try {
        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday start

        const [weeklyQuizzesCount, allResults] = await Promise.all([
            prisma.quizResult.count({
                where: { user_id: req.user.id, taken_at: { gte: startOfWeek } }
            }),
            prisma.quizResult.findMany({
                where: { user_id: req.user.id }
            })
        ]);

        let easyCount = 0, easyTotal = 0;
        let medCount = 0, medTotal = 0;
        let hardCount = 0, hardTotal = 0;
        let perfectScores = 0;

        allResults.forEach(r => {
            const diff = r.difficulty || 3; // Fallback to medium
            if (diff <= 2) { easyCount++; easyTotal += r.score_percentage; }
            else if (diff === 3) { medCount++; medTotal += r.score_percentage; }
            else { hardCount++; hardTotal += r.score_percentage; }

            if (r.score_percentage === 100) perfectScores++;
        });

        res.json({
            weeklyQuizzesCount,
            achievements: {
                perfectScore: perfectScores > 0,
                consistentLearner: allResults.length > 10
            },
            averages: {
                easy: easyCount > 0 ? (easyTotal / easyCount) : 0,
                medium: medCount > 0 ? (medTotal / medCount) : 0,
                hard: hardCount > 0 ? (hardTotal / hardCount) : 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching tracker insights' });
    }
};

module.exports = { getQuizQuestions, submitQuiz, generateQuiz, saveAIQuizResult, getQuizResults, getQuizTrackerInsights };
