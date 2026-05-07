export function normalizeHeaders(
  rawHeaders: Record<string, string | string[] | undefined> | undefined
): Record<string, string> {
  const normalized: Record<string, string> = {};
  if (!rawHeaders) {
    return normalized;
  }
  Object.entries(rawHeaders).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    const normalizedValue = Array.isArray(value) ? value.join(', ') : value;
    normalized[key.toLowerCase()] = normalizedValue;
  });
  return normalized;
}

export function stripHopByHopHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized = { ...headers };
  delete sanitized.host;
  delete sanitized['content-length'];
  return sanitized;
}
