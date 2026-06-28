const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        
        if (user && user.role === 'ADMIN') {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden: Admin access required' });
        }
    } catch (err) {
        console.error("Error in adminMiddleware:", err);
        res.status(500).json({ message: 'Server error in admin authorization' });
    }
};

module.exports = adminMiddleware;
