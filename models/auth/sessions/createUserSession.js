"use strict";

const { Session } = require('../db/models');

async function createUserSession(userId, sessionToken, ip) {
    try {
        const newSession = await Session.create({
            userId: userId,
            sessionToken: sessionToken,
            ip: ip
        });
        return newSession;
    } catch (error) {
        console.error('Error creating user session:', error);
        throw error;
    }
}

module.exports = createUserSession;