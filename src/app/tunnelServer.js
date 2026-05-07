"use strict";

const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { Cloudcast, ApiToken } = require('../../models/db/models');
const hashToken = require('../utils/tokens/hashToken');
const createToken = require('../utils/tokens/createToken');

const REQUEST_TIMEOUT_MS = 30000;
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'cloudcast.dev';
const CACHE_DIR = process.env.CLOUDCAST_CACHE_DIR || path.resolve(__dirname, '..', '..', '.cloudcast-cache');
const CACHE_KEY_HEADERS = ['accept', 'accept-language', 'accept-encoding'];

function normalizeHeaders(rawHeaders) {
    const normalized = {};
    if (!rawHeaders) {
        return normalized;
    }
    Object.entries(rawHeaders).forEach(([key, value]) => {
        if (value === undefined) {
            return;
        }
        const normalizedValue = Array.isArray(value) ? value.join(', ') : value;
        normalized[key.toLowerCase()] = normalizedValue;
    });
    return normalized;
}

function parseCacheControl(value) {
    const directives = {};
    if (!value) {
        return directives;
    }
    value.split(',').forEach((part) => {
        const [rawKey, ...rest] = part.trim().split('=');
        const key = rawKey.trim().toLowerCase();
        if (!key) {
            return;
        }
        if (rest.length === 0) {
            directives[key] = true;
            return;
        }
        directives[key] = rest.join('=').replace(/^"|"$/g, '');
    });
    return directives;
}

function getCacheMaxAgeSeconds(headers) {
    const cacheControl = headers['cache-control'];
    if (!cacheControl) {
        return null;
    }
    const directives = parseCacheControl(cacheControl);
    if (directives['no-store'] || directives['no-cache'] || directives.private) {
        return null;
    }
    const maxAgeValue = directives['s-maxage'] ?? directives['max-age'];
    if (typeof maxAgeValue === 'string') {
        const parsed = Number(maxAgeValue);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
        if (Number.isFinite(parsed) && parsed <= 0) {
            return null;
        }
    }
    const expiresHeader = headers.expires;
    if (expiresHeader) {
        const expiresAt = Date.parse(expiresHeader);
        if (!Number.isNaN(expiresAt)) {
            const diffSeconds = Math.floor((expiresAt - Date.now()) / 1000);
            if (diffSeconds > 0) {
                return diffSeconds;
            }
        }
    }
    return null;
}

function shouldBypassCache(requestHeaders) {
    const cacheControl = parseCacheControl(requestHeaders['cache-control']);
    if (cacheControl['no-store'] || cacheControl['no-cache']) {
        return true;
    }
    const maxAgeValue = cacheControl['max-age'];
    if (typeof maxAgeValue === 'string') {
        const parsed = Number(maxAgeValue);
        if (Number.isFinite(parsed) && parsed <= 0) {
            return true;
        }
    }
    const pragma = requestHeaders.pragma?.toLowerCase();
    if (pragma === 'no-cache') {
        return true;
    }
    return false;
}

function isCacheableRequest(method, headers) {
    if (!['GET', 'HEAD'].includes(String(method).toUpperCase())) {
        return false;
    }
    if (headers.authorization || headers.cookie) {
        return false;
    }
    if (shouldBypassCache(headers)) {
        return false;
    }
    return true;
}

function isCacheableResponse(status, headers, cacheSeconds) {
    if (!cacheSeconds) {
        return false;
    }
    if (status < 200 || status >= 300) {
        return false;
    }
    if (headers['set-cookie']) {
        return false;
    }
    return true;
}

function createCacheKey({ method, url, headers }) {
    const varyHeaders = {};
    CACHE_KEY_HEADERS.forEach((header) => {
        if (headers[header]) {
            varyHeaders[header] = headers[header];
        }
    });
    const keyData = JSON.stringify({
        method: String(method).toUpperCase(),
        url,
        headers: varyHeaders
    });
    return crypto.createHash('sha256').update(keyData).digest('hex');
}

function getCachePath(key) {
    return path.join(CACHE_DIR, `${key}.json`);
}

async function readCacheEntry(key) {
    try {
        const raw = await fs.readFile(getCachePath(key), 'utf8');
        const entry = JSON.parse(raw);
        if (Date.now() > entry.expiresAt) {
            try {
                await fs.unlink(getCachePath(key));
            } catch {
                // ignore cleanup errors
            }
            return null;
        }
        return entry;
    } catch {
        return null;
    }
}

async function writeCacheEntry(key, entry) {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(getCachePath(key), JSON.stringify(entry));
    } catch {
        // ignore cache write errors
    }
}

function sendCachedResponse(res, entry) {
    const ageSeconds = Math.max(0, Math.floor((Date.now() - entry.storedAt) / 1000));
    const headers = { ...entry.headers, age: String(ageSeconds) };
    Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() === 'transfer-encoding') {
            return;
        }
        res.setHeader(key, value);
    });
    const bodyBuffer = entry.body ? Buffer.from(entry.body, 'base64') : Buffer.alloc(0);
    res.status(entry.status || 200).send(bodyBuffer);
}

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
            const headers = normalizeHeaders(message.headers || {});
            Object.entries(headers).forEach(([key, value]) => {
                if (key.toLowerCase() === 'transfer-encoding') {
                    return;
                }
                pending.res.setHeader(key, value);
            });
            const statusCode = message.status || 200;
            if (pending.cacheAllowed && pending.cacheKey) {
                const cacheSeconds = getCacheMaxAgeSeconds(headers);
                if (isCacheableResponse(statusCode, headers, cacheSeconds)) {
                    const now = Date.now();
                    const bodyBase64 = typeof message.body === 'string'
                        ? message.body
                        : (bodyBuffer.length ? bodyBuffer.toString('base64') : null);
                    await writeCacheEntry(pending.cacheKey, {
                        status: statusCode,
                        headers,
                        body: bodyBase64,
                        storedAt: now,
                        expiresAt: now + cacheSeconds * 1000
                    });
                }
            }
            pending.res.status(statusCode).send(bodyBuffer);
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
        const requestHeaders = normalizeHeaders(req.headers);
        const requestMethod = req.method || 'GET';
        const host = req.headers.host || 'localhost';
        const protocol = req.protocol || 'http';
        const requestUrl = `${protocol}://${host}${req.originalUrl}`;
        const cacheAllowed = isCacheableRequest(requestMethod, requestHeaders);
        const cacheKey = cacheAllowed ? createCacheKey({ method: requestMethod, url: requestUrl, headers: requestHeaders }) : null;
        if (cacheAllowed && cacheKey) {
            const cachedEntry = await readCacheEntry(cacheKey);
            if (cachedEntry) {
                sendCachedResponse(res, cachedEntry);
                return true;
            }
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
        pendingRequests.set(requestId, { res, timeout, cacheAllowed, cacheKey });
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
