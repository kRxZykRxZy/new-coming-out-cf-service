const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const loginRoutes = require('../routes/auth/login.js');
const signupRoutes = require('../routes/auth/signup.js');
const sessionRoutes = require('../routes/auth/session.js');
const logoutRoutes = require('../routes/auth/logout.js');
const cloudcastRoutes = require('../routes/cloudcasts/newCloudcast.js');
const domainRoutes = require('../routes/domains/index.js');
const cliAuthRoutes = require('../routes/cli/auth.js');

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.set('trust proxy', 1);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', loginRoutes);
app.use('/api/auth', signupRoutes);
app.use('/api/auth', sessionRoutes);
app.use('/api/auth', logoutRoutes);
app.use('/api/cloudcasts', cloudcastRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api', cliAuthRoutes);

app.use(async (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    const tunnelServer = req.app.locals.tunnelServer;
    if (!tunnelServer) {
        return res.status(503).json({ message: 'Tunnel server unavailable' });
    }
    try {
        const handled = await tunnelServer.handleHttpRequest(req, res);
        if (!handled) {
            return next();
        }
        return null;
    } catch (error) {
        return res.status(502).json({ message: 'Tunnel error' });
    }
});

module.exports = app;
