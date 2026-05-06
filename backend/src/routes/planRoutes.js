const express = require('express');
const router = express.Router();
const { generateStudyPlan } = require('../services/allocationEngine');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const { fullRecalculate, forceFullSemester } = req.body || {};
        const plan = await generateStudyPlan(req.user.id, fullRecalculate, forceFullSemester);
        res.status(201).json({ message: 'Study plan generated', plan });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Server error generating plan' });
    }
});

router.get('/current', authMiddleware, async (req, res) => {
    try {
        // Find most recent plan for user
        const plan = await prisma.studyPlan.findFirst({
            where: { user_id: req.user.id },
            orderBy: { generated_date: 'desc' }
        });

        if (!plan) return res.status(404).json({ message: 'No plan exists. Generate one.' });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const activePlanWeekStart = new Date(plan.week_start_date || new Date());
        const dayOfWeek = activePlanWeekStart.getDay();
        const diff = activePlanWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStartAnchor = new Date(activePlanWeekStart);
        weekStartAnchor.setDate(diff);
        weekStartAnchor.setHours(0, 0, 0, 0);

        // Fetch all historical sessions (past) AND sessions belonging explicitly to the current plan
        let allSessions = await prisma.studySession.findMany({
            where: { 
                topic: { user_id: req.user.id },
                OR: [
                    { study_plan_id: plan.id },
                    { session_date: { lt: todayStart } }
                ]
            },
            include: {
                topic: { include: { course: true } },
                studyPlan: true
            }
        });

        // Map to hold the maximum generation date of ANY session for each day
        const dateStrMaxPlanDate = new Map();

        for (const session of allSessions) {
            if (!session.session_date) continue;
            const dateStr = new Date(session.session_date).toISOString().split('T')[0];
            
            const currentMax = dateStrMaxPlanDate.get(dateStr) || new Date(0);
            const sessionPlanDate = session.studyPlan ? new Date(session.studyPlan.generated_date) : new Date(0);
            
            if (sessionPlanDate > currentMax) {
                dateStrMaxPlanDate.set(dateStr, sessionPlanDate);
            }
        }

        allSessions = allSessions.filter(session => {
            if (!session.session_date) return false;
            
            // Keep if it belongs to the current plan
            if (session.study_plan_id === plan.id) return true;
            // Keep if it's completed
            if (session.completed) return true;
            
            // Otherwise, it's an uncompleted legacy session.
            const dateStr = new Date(session.session_date).toISOString().split('T')[0];
            const maxPlanDate = dateStrMaxPlanDate.get(dateStr);
            const sessionPlanDate = session.studyPlan ? new Date(session.studyPlan.generated_date) : new Date(0);

            // ONLY keep it if it belongs to the most recent plan that had sessions for this specific date,
            // dropping older intersecting legacy sessions that cause UI overlaps
            if (sessionPlanDate.getTime() === maxPlanDate?.getTime()) {
                return true;
            }

            return false;
        });

        // Ensure chronological ordering across all returned sessions
        allSessions.sort((a, b) => {
            const dateA = new Date(a.session_date).getTime();
            const dateB = new Date(b.session_date).getTime();
            if (dateA !== dateB) return dateA - dateB;

            const timeA = a.start_time.split(':').map(Number);
            const timeB = b.start_time.split(':').map(Number);
            if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
            return timeA[1] - timeB[1];
        });

        const activeSession = await prisma.academicSession.findFirst({
            where: { user_id: req.user.id },
            orderBy: { start_date: 'desc' }
        });
        const today = new Date();
        const isSemesterBreak = Boolean(activeSession && today > activeSession.end_date);

        plan.sessions = allSessions;
        
        // Pass semester break status to frontend
        const planWithBreakStatus = {
            ...plan,
            isSemesterBreak
        };

        res.json(planWithBreakStatus);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching plan' });
    }
});

module.exports = router;
