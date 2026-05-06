"use strict";

const { Session } = require('../../db/models');

async function deleteUserSession(sessionToken) {
    try {
        const deletedCount = await Session.destroy({ where: { sessionToken: sessionToken } });
        if (deletedCount === 0) {
            throw new Error('Session not found');
        }
        return true;
    } catch (error) {
        console.error('Error deleting user session:', error);
        throw error;
    }
}

module.exports = deleteUserSession;