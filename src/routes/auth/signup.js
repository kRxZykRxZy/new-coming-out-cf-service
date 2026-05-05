const express = require('express');
const router = express.Router();

const createUser = require('../../../models/auth/users/createUser');

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const newUser = await createUser(username, email, password, req.ip);
        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

module.exports = router;