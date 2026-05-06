"use strict";

const express = require('express');
const router = express.Router();

const requireUser = require('../../utils/auth/requireUser');
const { Domain } = require('../../../models/db/models');

router.get('/', requireUser, async (req, res) => {
    try {
        const domains = await Domain.findAll({ where: { userId: req.user.id } });
        res.status(200).json({
            domains: domains.map((domain) => ({
                id: domain.id,
                name: domain.name,
                subdomains: JSON.parse(domain.subdomains || '[]'),
                dnsVerified: domain.dnsVerified
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Unable to list domains' });
    }
});

router.post('/', requireUser, async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Domain name is required' });
    }
    if (!/^[a-z0-9.-]+$/i.test(name)) {
        return res.status(400).json({ message: 'Invalid domain format' });
    }
    try {
        const domain = await Domain.create({
            userId: req.user.id,
            owner: req.user.email,
            name: name,
            subdomains: '[]',
            dnsVerified: false
        });
        res.status(201).json({
            domain: {
                id: domain.id,
                name: domain.name,
                subdomains: [],
                dnsVerified: domain.dnsVerified
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Unable to create domain' });
    }
});

router.post('/:id/subdomains', requireUser, async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Subdomain name is required' });
    }
    try {
        const domain = await Domain.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!domain) {
            return res.status(404).json({ message: 'Domain not found' });
        }
        const subdomains = JSON.parse(domain.subdomains || '[]');
        if (!subdomains.includes(name)) {
            subdomains.push(name);
            domain.subdomains = JSON.stringify(subdomains);
            await domain.save();
        }
        res.status(200).json({ subdomains: subdomains });
    } catch (error) {
        res.status(500).json({ message: 'Unable to add subdomain' });
    }
});

module.exports = router;
