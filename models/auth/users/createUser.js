"use strict";

const { User } = require('../db/models');

async function createUser(username, email, password, ip) {
    try {
        const newUser = await User.create({
            name: username,
            email: email,
            password: password,
            sessions: '[]',
            ips: JSON.stringify([ip]),
            domains: '[]'
        });
        return newUser;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

module.exports = createUser;