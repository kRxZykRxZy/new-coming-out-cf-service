const express = require('express');
const router = express.Router();

const loginUser = require('../../../models/auth/users/loginUser');
const createUserSession = require('../../../models/auth/sessions/createUserSession');
const createSessionToken = require('../../utils/sessions/createSessionToken');
const hashToken = require('../../utils/tokens/hashToken');
const createToken = require('../../utils/tokens/createToken');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const user = await loginUser(email, password);
        const sessionToken = await createSessionToken();
        const sessionTokenHash = hashToken(sessionToken);
        const sessionExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

        const session = await createUserSession(user.id, sessionTokenHash, req.ip, sessionExpiresAt);
        const csrfToken = createToken(32);
        res
            .status(200)
            .cookie('sessionToken', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
                expires: sessionExpiresAt
            })
            .cookie('csrfToken', csrfToken, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
                expires: sessionExpiresAt
            })
            .json({
                message: 'Login successful',
                user: { id: user.id, name: user.name, email: user.email },
                session: session,
                csrfToken: csrfToken
            });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
