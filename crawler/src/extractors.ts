import { Page } from 'playwright';
import { URL } from 'url';
import {
  AssetExtract,
  AssetType,
  EndpointExtract,
  EndpointType,
  FieldExtract,
  FormExtract,
} from '@surface/shared';
import { hasAssetExtension, normalizeUrl, resolveUrl } from './utils';

export async function extractLinks(page: Page, baseUrl: string): Promise<string[]> {
  const raw = await page.$$eval('a[href]', (anchors) =>
    anchors
      .map((a) => (a as HTMLAnchorElement).getAttribute('href'))
      .filter((h): h is string => !!h && h.trim().length > 0),
  );
  const links: string[] = [];
  for (const href of raw) {
    if (href.startsWith('#')) continue;
    const resolved = resolveUrl(baseUrl, href);
    if (resolved) links.push(normalizeUrl(resolved));
  }
  return [...new Set(links)];
}

export async function extractForms(page: Page): Promise<FormExtract[]> {
  return page.$$eval('form', (forms, base) => {
    return forms.map((form, idx): FormExtract => {
      const action = form.getAttribute('action') || base;
      const method = (form.getAttribute('method') || 'get').toUpperCase();
      const id = form.getAttribute('id') || `form-${idx}`;
      const fields: FieldExtract[] = [];
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach((input) => {
        const tag = input.tagName.toLowerCase();
        const el = input as HTMLElement;
        fields.push({
          name: el.getAttribute('name') || undefined,
          type: tag === 'select' ? 'select' : (el as HTMLInputElement).type,
          selector: tag,
          required: el.hasAttribute('required'),
          placeholder: el.getAttribute('placeholder') || undefined,
        });
      });
      const buttons: string[] = [];
      form.querySelectorAll('button, input[type="submit"]').forEach((b) => {
        const text = (b as HTMLElement).innerText || b.getAttribute('value') || b.tagName.toLowerCase();
        buttons.push(text.trim().toLowerCase());
      });
      return { action, method, selector: `form#${id}`, id, fields, buttons };
    });
  }, baseUrl);
}

export async function extractAssets(page: Page, baseUrl: string): Promise<AssetExtract[]> {
  const assets: AssetExtract[] = [];

  const scripts = await page.$$eval('script[src]', (els) =>
    els.map((s) => (s as HTMLScriptElement).getAttribute('src') as string),
  );
  for (const src of scripts) {
    const url = resolveUrl(baseUrl, src);
    if (url) assets.push({ url: normalizeUrl(url), type: AssetType.SCRIPT, discoveredFrom: baseUrl });
  }

  const styles = await page.$$eval('link[rel="stylesheet"]', (els) =>
    els.map((l) => (l as HTMLLinkElement).getAttribute('href') as string),
  );
  for (const href of styles) {
    const url = resolveUrl(baseUrl, href);
    if (url) assets.push({ url: normalizeUrl(url), type: AssetType.STYLESHEET, discoveredFrom: baseUrl });
  }

  const images = await page.$$eval('img[src]', (els) =>
    els.map((i) => (i as HTMLImageElement).getAttribute('src') as string),
  );
  for (const src of images) {
    const url = resolveUrl(baseUrl, src);
    if (url) assets.push({ url: normalizeUrl(url), type: AssetType.IMAGE, discoveredFrom: baseUrl });
  }

  const fonts = await page.$$eval('link[rel="preload"][as="font"], link[rel="font"]', (els) =>
    els.map((l) => (l as HTMLLinkElement).getAttribute('href') as string),
  );
  for (const href of fonts) {
    const url = resolveUrl(baseUrl, href);
    if (url) assets.push({ url: normalizeUrl(url), type: AssetType.FONT, discoveredFrom: baseUrl });
  }

  return dedupeAssets(assets);
}

export function determineAssetType(url: string, resourceType?: string): AssetType | undefined {
  const pathname = url.toLowerCase();
  if (resourceType === 'script' || pathname.endsWith('.js') || pathname.endsWith('.mjs')) return AssetType.SCRIPT;
  if (resourceType === 'stylesheet' || pathname.endsWith('.css')) return AssetType.STYLESHEET;
  if (resourceType === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(pathname)) return AssetType.IMAGE;
  if (resourceType === 'font' || /\.(woff2?|ttf|otf|eot)$/.test(pathname)) return AssetType.FONT;
  if (resourceType === 'document' || resourceType === 'xhr' || resourceType === 'fetch') return undefined;
  return AssetType.OTHER;
}

export function classifyEndpointType(url: string, contentType?: string): EndpointType {
  const lower = url.toLowerCase();
  const ct = (contentType || '').toLowerCase();
  if (lower.includes('/graphql') || ct.includes('graphql')) return EndpointType.GRAPHQL;
  if (lower.includes('/api/') || ct.includes('application/json')) return EndpointType.REST;
  if (hasAssetExtension(url)) return EndpointType.STATIC;
  return EndpointType.UNKNOWN;
}

export function extractJsRoutes(html: string, baseUrl: string): string[] {
  const routes = new Set<string>();
  const regexes = [
    /['"`][/]([a-zA-Z0-9_\-/]+)['"`]/g,
    /path:\s*['"`][/]([a-zA-Z0-9_\-/]+)['"`]/g,
    /route:\s*['"`][/]([a-zA-Z0-9_\-/]+)['"`]/g,
    /href=['"`][/]([a-zA-Z0-9_\-/]+)['"`]/g,
  ];
  for (const re of regexes) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const route = '/' + m[1];
      const resolved = resolveUrl(baseUrl, route);
      if (resolved) routes.add(normalizeUrl(resolved));
    }
  }
  return [...routes];
}

export function dedupeAssets(assets: AssetExtract[]): AssetExtract[] {
  const seen = new Set<string>();
  const out: AssetExtract[] = [];
  for (const a of assets) {
    const key = `${a.type}|${a.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(a);
    }
  }
  return out;
}

export function dedupeEndpoints(endpoints: EndpointExtract[]): EndpointExtract[] {
  const seen = new Set<string>();
  const out: EndpointExtract[] = [];
  for (const e of endpoints) {
    const key = `${e.method || 'GET'}|${e.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

export async function fetchRobots(origin: string): Promise<string> {
  const res = await fetch(`${origin}/robots.txt`);
  if (!res.ok) return '';
  return res.text();
}

export function parseRobotsDisallowed(robots: string, userAgent = '*'): string[] {
  const lines = robots.split('\n');
  const disallowed: string[] = [];
  let relevant = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('user-agent:')) {
      const ua = trimmed.slice('user-agent:'.length).trim();
      relevant = ua === '*' || ua.toLowerCase() === userAgent.toLowerCase();
      continue;
    }
    if (relevant && trimmed.toLowerCase().startsWith('disallow:')) {
      const path = trimmed.slice('disallow:'.length).trim();
      if (path) disallowed.push(path);
    }
  }
  return disallowed;
}

export function isAllowedByRobots(pathname: string, disallowed: string[]): boolean {
  return !disallowed.some((p) => pathname.startsWith(p));
}

export async function fetchSitemap(origin: string): Promise<string[]> {
  let urls: string[] = [];
  try {
    const robots = await fetchRobots(origin);
    const sitemapLine = robots.split('\n').find((l) => l.trim().toLowerCase().startsWith('sitemap:'));
    if (sitemapLine) {
      const sitemapUrl = sitemapLine.slice('sitemap:'.length).trim();
      urls = await parseSitemap(sitemapUrl);
    }
  } catch { /* ignore */ }
  if (urls.length === 0) {
    try {
      urls = await parseSitemap(`${origin}/sitemap.xml`);
    } catch { /* ignore */ }
  }
  return urls;
}

async function parseSitemap(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) return [];
  const text = await res.text();
  const urls: string[] = [];
  const re = /<loc>(.*?)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    try {
      const u = new URL(m[1]).toString();
      urls.push(u);
    } catch { /* ignore */ }
  }
  return urls;
}

export function isGraphQLEndpoint(url: string, contentType?: string): boolean {
  const lower = url.toLowerCase();
  const ct = (contentType || '').toLowerCase();
  return lower.includes('/graphql') || ct.includes('graphql');
}

export function isRestEndpoint(url: string, contentType?: string): boolean {
  const lower = url.toLowerCase();
  const ct = (contentType || '').toLowerCase();
  return lower.includes('/api/') || ct.includes('application/json') || ct.includes('application/hal+json');
}
