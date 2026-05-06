const API_BASE = Deno.env.get('CLOUDCAST_API_URL') ?? 'http://localhost:8000';
const APP_URL = Deno.env.get('CLOUDCAST_APP_URL') ?? 'http://localhost:5173';

type Config = {
  apiUrl: string;
  apiToken: string;
};

function getConfigPath(): string {
  const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE');
  if (!home) {
    throw new Error('Unable to resolve home directory.');
  }
  return `${home}/.cloudcast/config.json`;
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
      const target = new URL(message.path, cloudcast.targetUrl);
      const bodyBytes = message.body ? fromBase64(message.body) : undefined;
      const headers = { ...(message.headers ?? {}) } as Record<string, string>;
      delete headers.host;
      delete headers['content-length'];
      const response = await fetch(target.toString(), {
        method: message.method,
        headers,
        body: bodyBytes
      });
      const responseBuffer = new Uint8Array(await response.arrayBuffer());
      const headers = Object.fromEntries(response.headers.entries());
      socket.send(JSON.stringify({
        type: 'response',
        id: message.id,
        status: response.status,
        headers,
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
