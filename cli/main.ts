const API_BASE = Deno.env.get('CLOUDCAST_API_URL') ?? 'http://localhost:8000';
const APP_URL = Deno.env.get('CLOUDCAST_APP_URL') ?? 'http://localhost:5173';
const CACHE_VARY_HEADERS = ['accept', 'accept-language', 'accept-encoding'];

type Config = {
  apiUrl: string;
  apiToken: string;
};

type CacheEntry = {
  status: number;
  headers: Record<string, string>;
  body: string | null;
  storedAt: number;
  expiresAt: number;
};

type CacheKeyInput = {
  method: string;
  url: string;
  headers: Record<string, string>;
};

function getHomeDir(): string {
  const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE');
  if (!home) {
    throw new Error('Unable to resolve home directory.');
  }
  return home;
}

function getConfigPath(): string {
  return `${getHomeDir()}/.cloudcast/config.json`;
}

function getCacheDir(): string {
  return Deno.env.get('CLOUDCAST_CACHE_DIR') ?? `${getHomeDir()}/.cloudcast/cache`;
}

async function loadConfig(): Promise<Config | null> {
  try {
    const data = await Deno.readTextFile(getConfigPath());
    return JSON.parse(data) as Config;
  } catch {
    return null;
  }
}

async function saveConfig(config: Config) {
  const path = getConfigPath();
  const dir = path.substring(0, path.lastIndexOf('/'));
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(path, JSON.stringify(config, null, 2));
}

async function removeConfig() {
  try {
    await Deno.remove(getConfigPath());
  } catch {
    // ignore
  }
}

function generateToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeHeaders(
  rawHeaders: Record<string, string | string[] | undefined> | undefined
): Record<string, string> {
  const normalized: Record<string, string> = {};
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

function parseCacheControl(value: string | null): Record<string, string | boolean> {
  const directives: Record<string, string | boolean> = {};
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

function getCacheMaxAgeSeconds(headers: Headers): number | null {
  const cacheControl = headers.get('cache-control');
  if (!cacheControl) {
    return null;
  }
  const directives = parseCacheControl(cacheControl);
  if (directives['no-store'] || directives['no-cache']) {
    return null;
  }
  const maxAgeValue = directives['max-age'] ?? directives['s-maxage'];
  if (typeof maxAgeValue === 'string') {
    const parsed = Number(maxAgeValue);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const expiresHeader = headers.get('expires');
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

function shouldBypassCache(requestHeaders: Record<string, string>): boolean {
  const cacheControl = parseCacheControl(requestHeaders['cache-control'] ?? null);
  if (cacheControl['no-store'] || cacheControl['no-cache']) {
    return true;
  }
  if (cacheControl['max-age'] === '0') {
    return true;
  }
  const pragma = requestHeaders.pragma?.toLowerCase();
  if (pragma === 'no-cache') {
    return true;
  }
  return false;
}

function isCacheableRequest(method: string, headers: Record<string, string>): boolean {
  if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
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

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function createCacheKey(input: CacheKeyInput): Promise<string> {
  const varyHeaders: Record<string, string> = {};
  CACHE_VARY_HEADERS.forEach((header) => {
    if (input.headers[header]) {
      varyHeaders[header] = input.headers[header];
    }
  });
  const keyData = JSON.stringify({
    method: input.method.toUpperCase(),
    url: input.url,
    headers: varyHeaders
  });
  return sha256Hex(keyData);
}

function createDiskCache() {
  const cacheDir = getCacheDir();

  async function ensureCacheDir() {
    await Deno.mkdir(cacheDir, { recursive: true });
  }

  function getCachePath(key: string) {
    return `${cacheDir}/${key}.json`;
  }

  async function get(key: string): Promise<CacheEntry | null> {
    try {
      const raw = await Deno.readTextFile(getCachePath(key));
      const entry = JSON.parse(raw) as CacheEntry;
      if (Date.now() >= entry.expiresAt) {
        try {
          await Deno.remove(getCachePath(key));
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

  async function set(key: string, entry: CacheEntry) {
    try {
      await ensureCacheDir();
      await Deno.writeTextFile(getCachePath(key), JSON.stringify(entry));
    } catch {
      // ignore cache write errors
    }
  }

  return { get, set };
}

async function apiRequest(path: string, options: RequestInit = {}, config?: Config) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined)
  };
  if (config?.apiToken) {
    headers.Authorization = `Bearer ${config.apiToken}`;
  }
  const response = await fetch(`${config?.apiUrl ?? API_BASE}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return response.json().catch(() => ({}));
}

async function openBrowser(url: string) {
  console.log(`Open this URL to continue: ${url}`);
  try {
    const platform = Deno.build.os;
    if (platform === 'darwin') {
      new Deno.Command('open', { args: [url] }).spawn();
    } else if (platform === 'windows') {
      new Deno.Command('cmd', { args: ['/c', 'start', url] }).spawn();
    } else {
      new Deno.Command('xdg-open', { args: [url] }).spawn();
    }
  } catch {
    // ignore
  }
}

async function login() {
  const token = generateToken();
  await apiRequest('/api/cli/auth/request', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
  const url = `${APP_URL}/cli-auth?token=${token}`;
  await openBrowser(url);
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const status = await fetch(`${API_BASE}/api/cli/auth/status?token=${token}`).then((res) => res.json());
    if (status.status === 'approved' && status.apiToken) {
      await saveConfig({ apiUrl: API_BASE, apiToken: status.apiToken });
      console.log('CLI authenticated successfully.');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Login timed out.');
}

async function logout() {
  await removeConfig();
  console.log('Logged out.');
}

async function listCloudcasts() {
  const config = await loadConfig();
  if (!config) {
    throw new Error('Please login first.');
  }
  const data = await apiRequest('/api/cloudcasts', {}, config);
  (data.cloudcasts || []).forEach((cloudcast: { id: number; publicUrl: string; targetUrl: string; status: string }) => {
    console.log(`${cloudcast.id}  ${cloudcast.publicUrl} -> ${cloudcast.targetUrl} (${cloudcast.status})`);
  });
}

async function createCast() {
  const config = await loadConfig();
  if (!config) {
    throw new Error('Please login first.');
  }
  const targetUrl = prompt('Target URL (e.g. http://localhost:3000):') ?? '';
  if (!targetUrl) {
    throw new Error('Target URL is required.');
  }
  const options = await apiRequest('/api/cloudcasts/options', {}, config);
  const baseDomain = options.baseDomain ?? 'cloudcast.dev';
  const domains = options.domains ?? [];
  console.log('Select a domain:');
  console.log(`0) ${baseDomain} (base domain)`);
  domains.forEach((domain: { id: number; name: string }, index: number) => {
    console.log(`${index + 1}) ${domain.name}`);
  });
  const choice = Number(prompt('Enter choice number:') ?? '0');
  const domainId = choice > 0 ? String(domains[choice - 1]?.id ?? '') : '';
  const subdomain = prompt('Subdomain (optional):') ?? '';
  const payload: Record<string, string | null> = {
    targetUrl,
    subdomain: subdomain || null
  };
  if (domainId) {
    payload.domainId = domainId;
  }
  const result = await apiRequest('/api/cloudcasts', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, config);
  console.log(`CloudCast created: ${result.cloudcast.publicUrl}`);
  await startTunnel(String(result.cloudcast.id));
}

async function startTunnel(cloudcastId?: string) {
  const config = await loadConfig();
  if (!config) {
    throw new Error('Please login first.');
  }
  const cacheStore = createDiskCache();
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
      if (!requestPath.startsWith('/')) {
        throw new Error('Invalid request path.');
      }
      const target = new URL(requestPath, baseTarget);
      const bodyBytes = message.body ? fromBase64(message.body) : undefined;
      const headers = normalizeHeaders(message.headers ?? {});
      delete headers.host;
      delete headers['content-length'];
      const requestMethod = typeof message.method === 'string' ? message.method : 'GET';
      const cacheAllowed = isCacheableRequest(requestMethod, headers);
      const cacheKey = cacheAllowed
        ? await createCacheKey({ method: requestMethod, url: target.toString(), headers })
        : null;
      if (cacheAllowed && cacheKey) {
        const cachedEntry = await cacheStore.get(cacheKey);
        if (cachedEntry) {
          const ageSeconds = Math.max(0, Math.floor((Date.now() - cachedEntry.storedAt) / 1000));
          const cachedHeaders = { ...cachedEntry.headers, age: String(ageSeconds) };
          socket.send(JSON.stringify({
            type: 'response',
            id: message.id,
            status: cachedEntry.status,
            headers: cachedHeaders,
            body: cachedEntry.body
          }));
          return;
        }
      }
      const response = await fetch(target.toString(), {
        method: requestMethod,
        headers,
        body: bodyBytes
      });
      const responseBuffer = new Uint8Array(await response.arrayBuffer());
      const responseHeaders = Object.fromEntries(response.headers.entries());
      if (cacheAllowed && cacheKey) {
        const cacheSeconds = getCacheMaxAgeSeconds(response.headers);
        if (cacheSeconds && response.status >= 200 && response.status < 300 && !response.headers.has('set-cookie')) {
          const now = Date.now();
          await cacheStore.set(cacheKey, {
            status: response.status,
            headers: responseHeaders,
            body: responseBuffer.length ? toBase64(responseBuffer) : null,
            storedAt: now,
            expiresAt: now + cacheSeconds * 1000
          });
        }
      }
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

async function main() {
  const [command, subcommand, id] = Deno.args;
  try {
    if (command === 'login') {
      await login();
    } else if (command === 'logout') {
      await logout();
    } else if (command === 'list') {
      await listCloudcasts();
    } else if (command === 'create' && subcommand === 'cast') {
      await createCast();
    } else if (command === 'start') {
      await startTunnel(id);
    } else {
      console.log(`Usage:
  cloudcast login
  cloudcast logout
  cloudcast list
  cloudcast create cast
  cloudcast start [id]`);
    }
  } catch (error) {
    console.error(error.message || error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
