const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const planRoutes = require('./src/routes/planRoutes');

async function main() {
    const app = express();
    // mock req.user middleware
    app.use((req, res, next) => {
        req.user = { id: 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0' };
        next();
    });
    app.use('/plan', planRoutes);
    
    // start briefly and test
    const server = app.listen(5001, async () => {
        try {
            const res = await fetch('http://localhost:5001/plan/current');
            const data = await res.json();
            
            const sessions = data.sessions || [];
            console.log(`Returned ${sessions.length} sessions`);
            
            const april6to8 = sessions.filter(s => {
                const d = new Date(s.session_date);
                return d >= new Date('2026-04-06T00:00:00Z') && d < new Date('2026-04-09T00:00:00Z');
            });
            console.log(`Sessions from April 6 to 8 returned in API:`, april6to8.length);
        } catch (e) {
            console.error(e);
        } finally {
            server.close();
            prisma.$disconnect();
        }
    });
}

main().catch(console.error);
