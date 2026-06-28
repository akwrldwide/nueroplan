const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // 1. Try local jwt verification first (for tests/local custom tokens)
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            req.user = decoded;
            return next();
        } catch (localErr) {
            // Local check failed, try Supabase verification next
        }

        // 2. Parse Supabase credentials from DATABASE_URL
        const databaseUrl = process.env.DATABASE_URL || '';
        const match = databaseUrl.match(/postgres\.([^:@\s\?]+)/);
        if (!match) {
            throw new Error('Database URL format mismatch for Supabase parsing');
        }
        const projectRef = match[1];
        const supabaseUrl = `https://${projectRef}.supabase.co`;
        const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_lXDqsk5RjiDJPYC_WMhBKw_RYgjwSIs';

        // 3. Verify token with Supabase Auth API
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase Auth responded with status ${response.status}`);
        }

        const supabaseUser = await response.json();
        req.user = { id: supabaseUser.id, email: supabaseUser.email };
        next();
    } catch (err) {
        console.error("Auth Middleware Exception:", err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = authMiddleware;
