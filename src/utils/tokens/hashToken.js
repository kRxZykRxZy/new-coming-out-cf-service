"use strict";

const crypto = require('crypto');

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'cloudcast-dev-secret';

function hashToken(token) {
    return crypto.scryptSync(token, TOKEN_SECRET, 64).toString('hex');
}

module.exports = hashToken;
