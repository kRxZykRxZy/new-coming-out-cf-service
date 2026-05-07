import { loadConfig } from '../lib/config.ts';
import { apiRequest } from '../lib/api.ts';

export async function listCloudcasts() {
  const config = await loadConfig();
  if (!config) {
    throw new Error('Please login first.');
  }
  const data = await apiRequest('/api/cloudcasts', {}, config);
  (data.cloudcasts || []).forEach((cloudcast: { id: number; publicUrl: string; targetUrl: string; status: string }) => {
    console.log(`${cloudcast.id}  ${cloudcast.publicUrl} -> ${cloudcast.targetUrl} (${cloudcast.status})`);
  });
}
