"use strict";

const crypto = require('crypto');

function createToken(bytes = 48) {
    return crypto.randomBytes(bytes).toString('hex');
}

module.exports = createToken;
