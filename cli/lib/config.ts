export type Config = {
  apiUrl: string;
  apiToken: string;
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

export async function loadConfig(): Promise<Config | null> {
  try {
    const data = await Deno.readTextFile(getConfigPath());
    return JSON.parse(data) as Config;
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config) {
  const path = getConfigPath();
  const dir = path.substring(0, path.lastIndexOf('/'));
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(path, JSON.stringify(config, null, 2));
}

export async function removeConfig() {
  try {
    await Deno.remove(getConfigPath());
  } catch {
    // ignore
  }
}
