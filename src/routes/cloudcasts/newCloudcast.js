const express = require('express');
const router = express.Router();
const { URL } = require('url');

const requireUser = require('../../utils/auth/requireUser');
const { Cloudcast, Domain } = require('../../../models/db/models');

const BASE_DOMAIN = process.env.BASE_DOMAIN || 'cloudcast.dev';

function isValidUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function isValidSubdomain(value) {
    return /^[a-z0-9-]+$/i.test(value);
}

function buildPublicUrl(cloudcast) {
    if (cloudcast.subdomain) {
        return `https://${cloudcast.subdomain}.${BASE_DOMAIN}`;
    }
    return `https://${cloudcast.domain}`;
}

router.get('/options', requireUser, async (req, res) => {
    try {
        const domains = await Domain.findAll({ where: { userId: req.user.id } });
        res.status(200).json({
            baseDomain: BASE_DOMAIN,
            domains: domains.map((domain) => ({
                id: domain.id,
                name: domain.name,
                subdomains: JSON.parse(domain.subdomains || '[]'),
                dnsVerified: domain.dnsVerified
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Unable to load cloudcast options' });
    }
});

router.get('/', requireUser, async (req, res) => {
    try {
        const cloudcasts = await Cloudcast.findAll({ where: { userId: req.user.id } });
        res.status(200).json({
            cloudcasts: cloudcasts.map((cloudcast) => ({
                id: cloudcast.id,
                targetUrl: cloudcast.targetUrl,
                domain: cloudcast.domain,
                subdomain: cloudcast.subdomain,
                status: cloudcast.status,
                publicUrl: buildPublicUrl(cloudcast)
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Unable to list cloudcasts' });
    }
});

router.post('/', requireUser, async (req, res) => {
    const { targetUrl, domainId, domain, subdomain } = req.body;
    if (!targetUrl || !isValidUrl(targetUrl)) {
        return res.status(400).json({ message: 'A valid targetUrl is required' });
    }
    if (subdomain && !isValidSubdomain(subdomain)) {
        return res.status(400).json({ message: 'Subdomain may only include letters, numbers, and hyphens' });
    }
    try {
        let resolvedDomain = domain;
        if (domainId) {
            const domainRecord = await Domain.findOne({ where: { id: domainId, userId: req.user.id } });
            if (!domainRecord) {
                return res.status(404).json({ message: 'Domain not found' });
            }
            resolvedDomain = domainRecord.name;
            if (subdomain) {
                const subdomains = JSON.parse(domainRecord.subdomains || '[]');
                if (!subdomains.includes(subdomain)) {
                    subdomains.push(subdomain);
                    domainRecord.subdomains = JSON.stringify(subdomains);
                    await domainRecord.save();
                }
            }
        }
        if (!resolvedDomain) {
            resolvedDomain = BASE_DOMAIN;
        }
        const cloudcast = await Cloudcast.create({
            userId: req.user.id,
            owner: req.user.email,
            targetUrl: targetUrl,
            domain: resolvedDomain,
            subdomain: subdomain || null,
            status: 'offline'
        });
        res.status(201).json({
            cloudcast: {
                id: cloudcast.id,
                targetUrl: cloudcast.targetUrl,
                domain: cloudcast.domain,
                subdomain: cloudcast.subdomain,
                status: cloudcast.status,
                publicUrl: buildPublicUrl(cloudcast)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Unable to create cloudcast' });
    }
});

module.exports = router;
