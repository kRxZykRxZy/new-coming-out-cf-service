"use strict";

const { ApiToken, User } = require('../../../models/db/models');
const getUserSession = require('../../../models/auth/sessions/getUserSession');
const hashToken = require('../tokens/hashToken');

async function requireUser(req, res, next) {
    const sessionToken = req.cookies.sessionToken;
    if (sessionToken) {
        try {
            const session = await getUserSession(sessionToken);
            req.session = session;
            req.user = session.User;
            return next();
        } catch (error) {
            // Fall through to bearer token auth
        }
    }

    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        const apiToken = authHeader.replace('Bearer ', '').trim();
        const tokenHash = hashToken(apiToken);
        const tokenRecord = await ApiToken.findOne({
            where: { tokenHash: tokenHash },
            include: [{ model: User }]
        });
        if (tokenRecord) {
            tokenRecord.lastUsedAt = new Date();
            await tokenRecord.save();
            req.apiToken = tokenRecord;
            req.user = tokenRecord.User;
            return next();
        }
    }

    return res.status(401).json({ message: 'Authentication required' });
}

module.exports = requireUser;
