"use strict";

const express = require('express');
const router = express.Router();

const { CliAuthToken } = require('../../../models/db/models');
const createApiToken = require('../../utils/tokens/createApiToken');
const hashToken = require('../../utils/tokens/hashToken');
const requireUser = require('../../utils/auth/requireUser');

const CLI_TOKEN_TTL_MS = 10 * 60 * 1000;

router.post('/cli/auth/request', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: 'Token is required' });
    }
    try {
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + CLI_TOKEN_TTL_MS);
        const existing = await CliAuthToken.findOne({ where: { tokenHash: tokenHash } });
        if (existing) {
            if (existing.usedAt) {
                return res.status(400).json({ message: 'Token already used' });
            }
            existing.expiresAt = expiresAt;
            existing.userId = null;
            await existing.save();
            return res.status(200).json({ message: 'Token refreshed' });
        }
        await CliAuthToken.create({ tokenHash: tokenHash, expiresAt: expiresAt });
        return res.status(201).json({ message: 'Token registered' });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to register token' });
    }
});

router.post('/cli/auth/confirm', requireUser, async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: 'Token is required' });
    }
    try {
        const tokenHash = hashToken(token);
        const record = await CliAuthToken.findOne({ where: { tokenHash: tokenHash } });
        if (!record) {
            return res.status(404).json({ message: 'Token not found' });
        }
        if (record.usedAt) {
            return res.status(400).json({ message: 'Token already used' });
        }
        if (record.expiresAt < new Date()) {
            return res.status(410).json({ message: 'Token expired' });
        }
        record.userId = req.user.id;
        await record.save();
        return res.status(200).json({ message: 'CLI linked to account' });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to confirm token' });
    }
});

router.get('/cli/auth/status', async (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).json({ message: 'Token is required' });
    }
    try {
        const tokenHash = hashToken(String(token));
        const record = await CliAuthToken.findOne({ where: { tokenHash: tokenHash } });
        if (!record) {
            return res.status(404).json({ message: 'Token not found' });
        }
        if (record.expiresAt < new Date()) {
            return res.status(410).json({ message: 'Token expired' });
        }
        if (!record.userId) {
            return res.status(202).json({ status: 'pending' });
        }
        if (record.usedAt) {
            return res.status(410).json({ message: 'Token already exchanged' });
        }
        const { token: apiToken } = await createApiToken(record.userId, 'CLI token');
        record.usedAt = new Date();
        await record.save();
        return res.status(200).json({ status: 'approved', apiToken: apiToken });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to check token' });
    }
});

module.exports = router;
