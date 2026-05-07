export function generateToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
