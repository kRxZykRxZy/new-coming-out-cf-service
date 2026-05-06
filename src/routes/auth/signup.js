const express = require('express');
const router = express.Router();

const createUser = require('../../../models/auth/users/createUser');

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const newUser = await createUser(username, email, password);
        res.status(201).json({
            message: 'User registered successfully',
            user: { id: newUser.id, name: newUser.name, email: newUser.email }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
