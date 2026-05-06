"use strict";

const { Session, User } = require('../../db/models');
const hashToken = require('../../../src/utils/tokens/hashToken');

async function getUserSession(sessionToken) {
    try {
        const sessionTokenHash = hashToken(sessionToken);
        const session = await Session.findOne({
            where: { sessionTokenHash: sessionTokenHash },
            include: [{ model: User }]
        });
        if (!session) {
            throw new Error('Session not found');
        }
        if (session.expiresAt && session.expiresAt < new Date()) {
            throw new Error('Session expired');
        }
        return session;
    } catch (error) {
        console.error('Error getting user session:', error);
        throw error;
    }
}

module.exports = getUserSession;
