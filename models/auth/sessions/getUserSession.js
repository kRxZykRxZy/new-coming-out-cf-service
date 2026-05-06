"use strict";

const { Session } = require('../../db/models');

async function getUserSession(sessionToken) {
    try {
        const session = await Session.findOne({ where: { sessionToken: sessionToken } });
        if (!session) {
            throw new Error('Session not found');
        }
        return session;
    } catch (error) {
        console.error('Error getting user session:', error);
        throw error;
    }
}

module.exports = getUserSession;