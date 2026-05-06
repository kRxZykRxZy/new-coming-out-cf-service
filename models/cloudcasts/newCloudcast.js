"use strict";

const { Cloudcast } = require('../../db/models');

async function createCloudcast({ userId, owner, targetUrl, domain, subdomain }) {
    try {
        const cloudcast = await Cloudcast.create({
            userId: userId,
            targetUrl: targetUrl,
            domain: domain,
            subdomain: subdomain || null,
            status: 'offline',
            owner: owner || null
        });
        return cloudcast;
    } catch (error) {
        console.error('Error creating cloudcast:', error);
        throw error;
    }
}

async function listCloudcasts(userId) {
    try {
        return await Cloudcast.findAll({ where: { userId: userId } });
    } catch (error) {
        console.error('Error listing cloudcasts:', error);
        throw error;
    }
}

module.exports = { createCloudcast, listCloudcasts };
