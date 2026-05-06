const express = require('express');
const router = express.Router();

const deleteUserSession = require('../../../models/auth/sessions/deleteUserSession');

router.post('/logout', async (req, res) => {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
        return res.status(400).json({ message: 'No session token provided' });
    }
    try {
        await deleteUserSession(sessionToken);
        res.clearCookie('sessionToken', { httpOnly: true, secure: true, sameSite: 'Strict' });
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out' });
    }
});

module.exports = router;