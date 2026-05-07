import { login } from './commands/login.ts';
import { logout } from './commands/logout.ts';
import { listCloudcasts } from './commands/listCloudcasts.ts';
import { createCast } from './commands/createCast.ts';
import { startTunnel } from './commands/startTunnel.ts';

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
