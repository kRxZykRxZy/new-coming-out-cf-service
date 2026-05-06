"use strict";

const bcrypt = require('bcrypt');
const { User } = require('../../db/models');

async function loginUser(email, password) {
    try {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }
        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            throw new Error('User not found');
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw new Error('Incorrect password');
        }
        return user;
    } catch (error) {
        console.error('Error logging in user:', error);
        throw error;
    }
}

module.exports = loginUser;
