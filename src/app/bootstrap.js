const express = require('express');
const cors = require('cors');
const loginRoutes = require('../routes/auth/login.js');
const signupRoutes = require('../routes/auth/signup.js');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', loginRoutes);
app.use('/api/auth', signupRoutes);

module.exports = app;