const express = require('express');
const router = express.Router();

const getUserSession = require('../../../models/auth/sessions/getUserSession');

router.get('/session', async (req, res) => {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
        return res.status(401).json({ message: 'No session token provided' });
    }
    try {
        const session = await getUserSession(sessionToken);
        res.status(200).json({
            message: 'Session valid',
            session: {
                id: session.id,
                userId: session.userId,
                expiresAt: session.expiresAt
            },
            user: session.User ? { id: session.User.id, name: session.User.name, email: session.User.email } : null
        });
    } catch (error) {
        res.status(401).json({ message: 'Invalid session token' });
    }
});

module.exports = router;
