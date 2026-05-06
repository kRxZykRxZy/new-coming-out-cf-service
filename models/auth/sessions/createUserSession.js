"use strict";

const { Session } = require('../../db/models');

async function createUserSession(userId, sessionTokenHash, ip, expiresAt) {
    try {
        const newSession = await Session.create({
            userId: userId,
            sessionTokenHash: sessionTokenHash,
            ip: ip,
            expiresAt: expiresAt
        });
        return newSession;
    } catch (error) {
        console.error('Error creating user session:', error);
        throw error;
    }
}

module.exports = createUserSession;
