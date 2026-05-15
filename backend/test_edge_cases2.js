const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateStudyPlan } = require('./src/services/allocationEngine');

async function testKevinStones() {
    // We will find the user ID for Kevin Stones
    const users = await prisma.user.findMany({ where: { email: { contains: 'kevin' } }});
    let kevinId = users.length > 0 ? users[0].id : null;
    
    if (!kevinId) {
        const u = await prisma.user.findFirst();
        if (u) kevinId = u.id;
    }
    
    if (kevinId) {
        console.log("Testing plan generation for user:", kevinId);
        try {
            // Force active session to July 1 2026
            await prisma.academicSession.updateMany({
                where: { user_id: kevinId },
                data: { start_date: new Date('2026-07-01T00:00:00Z') }
            });

            const plan = await generateStudyPlan(kevinId, true, false);
            console.log("Plan generated successfully:", plan.sessionsCreated, "sessions created");

            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            const dbPlan = await prisma.studyPlan.findFirst({
                where: { user_id: kevinId, is_archived: false },
                orderBy: { generated_date: 'desc' }
            });

            console.log("Found plan ID:", dbPlan.id);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const activePlanWeekStart = new Date(dbPlan.week_start_date || new Date());
            const dayOfWeek = activePlanWeekStart.getDay();
            const diff = activePlanWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const weekStartAnchor = new Date(activePlanWeekStart);
            weekStartAnchor.setDate(diff);
            weekStartAnchor.setHours(0, 0, 0, 0);

            // Fetch all historical sessions (past) AND sessions belonging explicitly to the current plan
            let allSessions = await prisma.studySession.findMany({
                where: { 
                    topic: { user_id: kevinId },
                    OR: [
                        { study_plan_id: dbPlan.id },
                        { session_date: { lt: todayStart } }
                    ]
                },
                include: {
                    studyPlan: true
                }
            });

            console.log("All sessions before filtering:", allSessions.length);

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
                if (session.study_plan_id === dbPlan.id) return true;
                if (session.completed) return true;
                const dateStr = new Date(session.session_date).toISOString().split('T')[0];
                const maxPlanDate = dateStrMaxPlanDate.get(dateStr);
                const sessionPlanDate = session.studyPlan ? new Date(session.studyPlan.generated_date) : new Date(0);
                if (sessionPlanDate.getTime() === maxPlanDate?.getTime()) {
                    return true;
                }
                return false;
            });

            console.log("All sessions after filtering:", allSessions.length);

        } catch (error) {
            console.error("Error generating plan:", error);
        }
    }
}

testKevinStones().then(() => prisma.$disconnect());
