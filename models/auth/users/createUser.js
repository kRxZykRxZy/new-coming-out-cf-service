"use strict";

const { User } = require('../db/models');

async function createUser(username, email, password, ip) {
    try {
        // Check if user with the same email already exists
        const existingUser = await User.findOne({ where: { email: email } });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        // Check if user with the same username already exists
        const existingUsername = await User.findOne({ where: { name: username } });
        if (existingUsername) {
            throw new Error('User with this username already exists');
        }
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