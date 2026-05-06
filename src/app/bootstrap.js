const express = require('express');
const cors = require('cors');
const loginRoutes = require('../routes/auth/login.js');
const signupRoutes = require('../routes/auth/signup.js');
const cookieParser = require('cookie-parser');
const sessionRoutes = require('../routes/auth/sessions.js');
const logoutRoutes = require('../routes/auth/logout.js');
const newCloudcastRoutes = require('../routes/cloudcasts/newCloudcast.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', loginRoutes);
app.use('/api/auth', signupRoutes);
app.use('/api/auth', sessionRoutes);
app.use('/api/auth', logoutRoutes);
app.use('/api/cloudcasts', newCloudcastRoutes);

module.exports = app;