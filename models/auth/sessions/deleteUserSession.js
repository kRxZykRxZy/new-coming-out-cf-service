"use strict";

const { Session } = require('../../db/models');
const hashToken = require('../../../src/utils/tokens/hashToken');

async function deleteUserSession(sessionToken) {
    try {
        const sessionTokenHash = hashToken(sessionToken);
        const deletedCount = await Session.destroy({ where: { sessionTokenHash: sessionTokenHash } });
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
