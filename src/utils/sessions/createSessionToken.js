const crypto = require('crypto');

async function createSessionToken() {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(48, (err, buffer) => {
            if (err) {
                reject(err);
            } else {
                resolve(buffer.toString('hex'));
            }
        });
    });
}

module.exports = createSessionToken;