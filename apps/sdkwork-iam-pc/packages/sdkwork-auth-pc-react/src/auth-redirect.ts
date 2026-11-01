/**
 * Safety check for the desktop hand-off URL.
 *
 * The launch page receives its `redirectUrl` from the query string, so the URL
 * is attacker-influenced even though the authorization that produced it was
 * server-controlled. A hand-off may only target a native app surface (custom
 * scheme) or an RFC 8252 loopback redirect; anything else — a web origin,
 * `javascript:`, `data:`, `file:` — must never be auto-navigated to, otherwise
 * the page becomes an open redirect.
 */

const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

const BLOCKED_PROTOCOLS = new Set([
  'about',
  'blob',
  'chrome',
  'chrome-extension',
  'data',
  'file',
  'javascript',
  'moz-extension',
  'resource',
  'view-source',
  'vbscript',
]);

const MAX_REDIRECT_URL_LENGTH = 4096;

export function isSafeSdkworkDesktopLaunchUrl(raw: string): boolean {
  const value = raw.trim();
  if (value === '' || value.length > MAX_REDIRECT_URL_LENGTH) {
    return false;
  }
  // Control characters can hide a scheme from naive parsers and browsers
  // strip them silently; reject instead of normalizing.
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return false;
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  const protocol = parsed.protocol.replace(/:$/, '').toLowerCase();
  if (BLOCKED_PROTOCOLS.has(protocol)) {
    return false;
  }
  if (protocol === 'http' || protocol === 'https') {
    return LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase());
  }
  // A native deep link carries an explicit authority (`scheme://host/path`).
  return value.includes('://') && parsed.hostname !== '';
}
