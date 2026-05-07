export async function openBrowser(url: string) {
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
