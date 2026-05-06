"use strict";

const { ApiToken } = require('../../../models/db/models');
const createToken = require('./createToken');
const hashToken = require('./hashToken');

async function createApiToken(userId, label) {
    const token = createToken(32);
    const tokenHash = hashToken(token);
    const tokenRecord = await ApiToken.create({
        userId: userId,
        tokenHash: tokenHash,
        label: label || null
    });
    return { token, tokenRecord };
}

module.exports = createApiToken;
