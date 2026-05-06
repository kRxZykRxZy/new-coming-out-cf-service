"use strict";

const crypto = require('crypto');

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'cloudcast-dev-secret';

function hashToken(token) {
    return crypto.createHmac('sha256', TOKEN_SECRET).update(token).digest('hex');
}

module.exports = hashToken;
