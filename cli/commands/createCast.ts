import { loadConfig } from '../lib/config.ts';
import { apiRequest } from '../lib/api.ts';
import { startTunnel } from './startTunnel.ts';

export async function createCast() {
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
