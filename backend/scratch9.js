const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const planRoutes = require('./src/routes/planRoutes');

async function main() {
    const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
    console.log("querying plan for", user_id);
    const plan = await prisma.studyPlan.findFirst({
        where: { user_id },
        orderBy: { generated_date: 'desc' }
    });
    console.log("Latest plan:", plan.id, "generated:", plan.generated_date);
    
    // mimic planRoutes.js logic
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let allSessions = await prisma.studySession.findMany({
        where: { 
            topic: { user_id },
            OR: [
                { study_plan_id: plan.id },
                { session_date: { lt: todayStart } }
            ]
        },
        include: {
            topic: { include: { course: true } }
        }
    });

    console.log("Fetched initially:", allSessions.length);
    
    const uniqueSessionsMap = new Map();
    allSessions.forEach(session => {
        if (!session.session_date) return;
        const dateStr = new Date(session.session_date).toISOString().split('T')[0];
        const key = `${dateStr}-${session.start_time}`;
        const existing = uniqueSessionsMap.get(key);
        if (!existing) {
            uniqueSessionsMap.set(key, session);
        } else {
            if (session.completed && !existing.completed) {
                uniqueSessionsMap.set(key, session);
            } else if (!existing.completed && session.study_plan_id === plan.id) {
                uniqueSessionsMap.set(key, session);
            }
        }
    });
    
    allSessions = Array.from(uniqueSessionsMap.values());
    console.log("After dedup:", allSessions.length);

    const planStartBoundary = new Date(plan.week_start_date || new Date());
    planStartBoundary.setHours(0, 0, 0, 0);

    allSessions = allSessions.filter(session => {
        if (session.study_plan_id === plan.id) return true;
        if (session.completed) return true;
        if (new Date(session.session_date) < planStartBoundary) return true;
        return false;
    });

    console.log("After boundary filter:", allSessions.length);
    
    const april6to8 = allSessions.filter(s => {
        const d = new Date(s.session_date);
        return d >= new Date('2026-04-06T00:00:00Z') && d < new Date('2026-04-09T00:00:00Z');
    });
    console.log("April 6-8:", april6to8.length);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
