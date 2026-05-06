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
        res.status(200).json({ message: 'Session valid', session: session });
    } catch (error) {
        res.status(401).json({ message: 'Invalid session token' });
    }
});

module.exports = router;