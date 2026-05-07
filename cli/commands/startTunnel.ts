import { loadConfig } from '../lib/config.ts';
import { apiRequest } from '../lib/api.ts';
import { fromBase64, toBase64 } from '../lib/encoding.ts';
import { normalizeHeaders, stripHopByHopHeaders } from '../lib/headers.ts';

export async function startTunnel(cloudcastId?: string) {
  const config = await loadConfig();
  if (!config) {
    throw new Error('Please login first.');
  }
  let id = cloudcastId;
  if (!id) {
    const data = await apiRequest('/api/cloudcasts', {}, config);
    const casts = data.cloudcasts || [];
    if (casts.length === 0) {
      throw new Error('No CloudCasts available.');
    }
    casts.forEach((cloudcast: { id: number; publicUrl: string }, index: number) => {
      console.log(`${index + 1}) ${cloudcast.publicUrl}`);
    });
    const choice = Number(prompt('Select CloudCast:') ?? '1');
    id = String(casts[Math.max(choice - 1, 0)].id);
  }
  const data = await apiRequest('/api/cloudcasts', {}, config);
  const cloudcast = (data.cloudcasts || []).find((entry: { id: number }) => String(entry.id) === id);
  if (!cloudcast) {
    throw new Error('CloudCast not found.');
  }
  const wsUrl = `${config.apiUrl.replace('http', 'ws')}/api/tunnel?cloudcastId=${id}&token=${config.apiToken}`;
  const socket = new WebSocket(wsUrl);
  console.log('Connecting tunnel...');

  socket.onopen = () => {
    console.log(`Tunnel online for ${cloudcast.publicUrl}`);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type !== 'request') {
        return;
      }
      const baseTarget = new URL(cloudcast.targetUrl);
      if (!['http:', 'https:'].includes(baseTarget.protocol)) {
        throw new Error('Unsupported target protocol.');
      }
      const requestPath = typeof message.path === 'string' ? message.path : '/';
      if (!requestPath.startsWith('/') || requestPath.startsWith('//')) {
        throw new Error('Invalid request path.');
      }
      const rawPath = requestPath.split('?')[0];
      if (rawPath.split('/').some((segment) => segment === '..')) {
        throw new Error('Invalid request path.');
      }
      const relativeUrl = new URL(requestPath, 'http://cloudcast.local');
      const target = new URL(baseTarget);
      target.pathname = relativeUrl.pathname;
      target.search = relativeUrl.search;
      target.hash = relativeUrl.hash;
      const bodyBytes = message.body ? fromBase64(message.body) : undefined;
      const headers = stripHopByHopHeaders(normalizeHeaders(message.headers ?? {}));
      const requestMethod = typeof message.method === 'string' ? message.method : 'GET';
      const response = await fetch(target.toString(), {
        method: requestMethod,
        headers,
        body: bodyBytes
      });
      const responseBuffer = new Uint8Array(await response.arrayBuffer());
      const responseHeaders = Object.fromEntries(response.headers.entries());
      socket.send(JSON.stringify({
        type: 'response',
        id: message.id,
        status: response.status,
        headers: responseHeaders,
        body: responseBuffer.length ? toBase64(responseBuffer) : null
      }));
    } catch (error) {
      console.error('Tunnel error', error);
    }
  };

  socket.onclose = () => {
    console.log('Tunnel closed.');
  };

  await new Promise(() => {});
}
