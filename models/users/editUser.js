"use strict";

const { User } = require('../db/models');

async function changeUserPassword(userId, newPassword) {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }
        user.password = newPassword;
        await user.save();
        return user;
    } catch (error) {
        console.error('Error changing user password:', error);
        throw error;
    }
}

async function changeUserEmail(userId, newEmail) {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }
        user.email = newEmail;
        await user.save();
        return user;
    } catch (error) {
        console.error('Error changing user email:', error);
        throw error;
    }
}

module.exports = { changeUserPassword, changeUserEmail };