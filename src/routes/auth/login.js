const express = require('express');
const router = express.Router();

const loginUser = require('../../../models/auth/users/loginUser');
const createUserSession = require('../../../models/auth/sessions/createUserSession');
const createSessionToken = require('../../utils/sessions/createSessionToken');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await loginUser(email, password);
        const sessionToken = await createSessionToken();

        const session = await createUserSession(user.id, sessionToken, req.ip);
        await res.cookie('sessionToken', sessionToken, { httpOnly: true, secure: true, sameSite: 'Strict' }).send();
        res.status(200).json({ message: 'Login successful', user: user, session: session });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;