"use strict";

const bcrypt = require('bcrypt');
const { User } = require('../../db/models');

async function createUser(username, email, password) {
    try {
        if (!username || !email || !password) {
            throw new Error('Username, email, and password are required');
        }
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        const existingUser = await User.findOne({ where: { email: email } });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        const existingUsername = await User.findOne({ where: { name: username } });
        if (existingUsername) {
            throw new Error('User with this username already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({
            name: username,
            email: email,
            password: hashedPassword
        });
        return newUser;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

module.exports = createUser;
