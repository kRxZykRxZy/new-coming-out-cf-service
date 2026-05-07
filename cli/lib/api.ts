import { API_BASE } from './constants.ts';
import type { Config } from './config.ts';

export async function apiRequest(path: string, options: RequestInit = {}, config?: Config) {
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
