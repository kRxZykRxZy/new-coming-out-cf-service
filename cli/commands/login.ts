import { API_BASE, APP_URL } from '../lib/constants.ts';
import { apiRequest } from '../lib/api.ts';
import { generateToken } from '../lib/tokens.ts';
import { openBrowser } from '../lib/browser.ts';
import { saveConfig } from '../lib/config.ts';

export async function login() {
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
