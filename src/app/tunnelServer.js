"use strict";

const { WebSocketServer } = require('ws');
const { Cloudcast, ApiToken } = require('../../models/db/models');
const hashToken = require('../utils/tokens/hashToken');
const createToken = require('../utils/tokens/createToken');

const REQUEST_TIMEOUT_MS = 30000;
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'cloudcast.dev';

function createTunnelServer(server) {
    const connections = new Map();
    const pendingRequests = new Map();
    const wss = new WebSocketServer({ server, path: '/api/tunnel' });

    wss.on('connection', async (socket, request) => {
        try {
            const url = new URL(request.url, 'http://localhost');
            const cloudcastId = url.searchParams.get('cloudcastId');
            const token = url.searchParams.get('token') || (request.headers.authorization || '').replace('Bearer ', '').trim();
            if (!cloudcastId || !token) {
                socket.close(1008, 'Missing credentials');
                return;
            }
            const tokenHash = hashToken(token);
            const apiToken = await ApiToken.findOne({ where: { tokenHash: tokenHash } });
            if (!apiToken) {
                socket.close(1008, 'Invalid token');
                return;
            }
            const cloudcast = await Cloudcast.findByPk(cloudcastId);
            if (!cloudcast || cloudcast.userId !== apiToken.userId) {
                socket.close(1008, 'Cloudcast not found');
                return;
            }
            connections.set(String(cloudcastId), { socket, cloudcastId: cloudcast.id });
            cloudcast.status = 'online';
            cloudcast.lastSeenAt = new Date();
            await cloudcast.save();

            socket.on('message', (data) => {
                handleSocketMessage(String(cloudcastId), data);
            });

            socket.on('close', async () => {
                const existing = connections.get(String(cloudcastId));
                if (existing && existing.socket === socket) {
                    connections.delete(String(cloudcastId));
                    const cast = await Cloudcast.findByPk(cloudcastId);
                    if (cast) {
                        cast.status = 'offline';
                        await cast.save();
                    }
                }
            });
        } catch (error) {
            socket.close(1011, 'Server error');
        }
    });

    function handleSocketMessage(cloudcastId, data) {
        let message;
        try {
            message = JSON.parse(data.toString());
        } catch (error) {
            return;
        }
        if (message.type === 'response' && message.id) {
            const pending = pendingRequests.get(message.id);
            if (!pending) {
                return;
            }
            pendingRequests.delete(message.id);
            clearTimeout(pending.timeout);
            const bodyBuffer = message.body ? Buffer.from(message.body, 'base64') : Buffer.alloc(0);
            const headers = message.headers || {};
            Object.entries(headers).forEach(([key, value]) => {
                if (key.toLowerCase() === 'transfer-encoding') {
                    return;
                }
                pending.res.setHeader(key, value);
            });
            pending.res.status(message.status || 200).send(bodyBuffer);
        }
    }

    async function resolveCloudcastForRequest(req) {
        const hostHeader = req.headers.host || '';
        const host = hostHeader.split(':')[0];
        if (!host) {
            return null;
        }
        if (host.endsWith(`.${BASE_DOMAIN}`)) {
            const subdomain = host.replace(`.${BASE_DOMAIN}`, '');
            return Cloudcast.findOne({ where: { subdomain: subdomain, domain: BASE_DOMAIN } });
        }
        return Cloudcast.findOne({ where: { domain: host } });
    }

    async function handleHttpRequest(req, res) {
        const cloudcast = await resolveCloudcastForRequest(req);
        if (!cloudcast) {
            res.status(404).json({ message: 'Cloudcast not found' });
            return true;
        }
        const connection = connections.get(String(cloudcast.id));
        if (!connection) {
            res.status(502).json({ message: 'Cloudcast is offline' });
            return true;
        }
        const requestId = createToken(16);
        const body = await collectRequestBody(req);
        const payload = {
            type: 'request',
            id: requestId,
            method: req.method,
            path: req.originalUrl,
            headers: req.headers,
            body: body.length ? body.toString('base64') : null
        };
        connection.socket.send(JSON.stringify(payload));
        const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            res.status(504).json({ message: 'Cloudcast timed out' });
        }, REQUEST_TIMEOUT_MS);
        pendingRequests.set(requestId, { res, timeout });
        return true;
    }

    return {
        handleHttpRequest
    };
}

function collectRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', (err) => reject(err));
    });
}

module.exports = createTunnelServer;
