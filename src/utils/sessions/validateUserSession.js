const getUserSession = require('../../../models/auth/sessions/getUserSession');

async function validateUserSession(req, res, next) {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
        return res.status(401).json({ message: 'No session token provided' });
    }
    try {
        const session = await getUserSession(sessionToken);
        req.session = session; // Attach session to request object
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid session token' });
    }
}

module.exports = validateUserSession;