"use strict";

const { User } = require('../../db/models');

async function loginUser(email, password) {
    try {
        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            throw new Error('User not found');
        }
        if (user.password !== password) {
            throw new Error('Incorrect password');
        }
        return user;
    } catch (error) {
        console.error('Error logging in user:', error);
        throw error;
    }
}

module.exports = loginUser;