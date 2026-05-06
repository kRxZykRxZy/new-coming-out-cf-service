const createToken = require('../tokens/createToken');

async function createSessionToken() {
    return createToken(48);
}

module.exports = createSessionToken;
