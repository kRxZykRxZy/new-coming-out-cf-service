import { removeConfig } from '../lib/config.ts';

export async function logout() {
  await removeConfig();
  console.log('Logged out.');
}
