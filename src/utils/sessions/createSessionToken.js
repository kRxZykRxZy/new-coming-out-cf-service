import crypto from 'crypto';

export default async function createSessionToken() {
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