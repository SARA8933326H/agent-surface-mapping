import { URL } from 'url';

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+/g, '/');
    return url.toString();
  } catch {
    return raw;
  }
}

export function isHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

export function flattenHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined) out[k.toLowerCase()] = String(v);
  }
  return out;
}

export function getPathname(raw: string): string {
  try {
    return new URL(raw).pathname;
  } catch {
    return '';
  }
}

export function resolveUrl(base: string, relative: string): string | undefined {
  try {
    return new URL(relative, base).toString();
  } catch {
    return undefined;
  }
}

const ASSET_EXTENSIONS = new Set([
  '.js', '.mjs', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp4', '.webm', '.ogg', '.mp3',
  '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z', '.doc', '.docx', '.xls', '.xlsx',
]);

export function hasAssetExtension(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = pathname.slice(pathname.lastIndexOf('.'));
    return ASSET_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

export function isPotentialEndpoint(url: string): boolean {
  if (!isHttpUrl(url)) return false;
  if (hasAssetExtension(url)) return false;
  return true;
}
