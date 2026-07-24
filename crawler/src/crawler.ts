import { chromium, Browser, BrowserContext } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import {
  CrawlOptions,
  CrawlResult,
  EndpointExtract,
  EndpointType,
  PageExtract,
} from '@surface/shared';
import {
  extractAssets,
  extractForms,
  extractJsRoutes,
  extractLinks,
  fetchRobots,
  fetchSitemap,
  isAllowedByRobots,
  parseRobotsDisallowed,
  dedupeEndpoints,
  dedupeAssets,
  determineAssetType,
  classifyEndpointType,
  isGraphQLEndpoint,
  isRestEndpoint,
} from './extractors';
import {
  flattenHeaders,
  isHttpUrl,
  isPotentialEndpoint,
  normalizeUrl,
  sameOrigin,
} from './utils';

export async function crawlWebsite(startUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const start = Date.now();
  const startUri = new URL(startUrl);
  const origin = startUri.origin;

  const maxPages = options.maxPages ?? 50;
  const maxDepth = options.maxDepth ?? 3;
  const sameOriginOnly = options.sameOrigin ?? true;
  const respectRobots = options.respectRobots ?? true;
  const includeSitemap = options.includeSitemap ?? true;
  const screenshotDir = options.screenshotDir ?? './screenshots';
  const headless = options.browserHeadless ?? true;
  const timeout = options.browserTimeout ?? 30000;

  await mkdir(screenshotDir, { recursive: true });

  let disallowedPaths: string[] = [];
  if (respectRobots) {
    try {
      const robots = await fetchRobots(origin);
      disallowedPaths = parseRobotsDisallowed(robots, '*');
    } catch { /* robots.txt is optional */ }
  }

  let sitemapUrls: string[] = [];
  if (includeSitemap) {
    try {
      sitemapUrls = await fetchSitemap(origin);
    } catch { /* sitemap is optional */ }
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent: 'AttackSurfaceDiscoveryBot/0.1 (authorized security audit)',
  });

  const visited = new Set<string>();
  const pages: PageExtract[] = [];
  const allEndpoints: EndpointExtract[] = [];
  const allAssets: { url: string; type: import('@surface/shared').AssetType; discoveredFrom?: string }[] = [];
  const discoveredUrls = new Set<string>();
  const errors: string[] = [];

  const queue: { url: string; depth: number; parentUrl?: string }[] = [
    { url: normalizeUrl(startUrl), depth: 0 },
  ];
  for (const sitemapUrl of sitemapUrls) {
    if (sameOriginOnly && !sameOrigin(startUrl, sitemapUrl)) continue;
    queue.push({ url: normalizeUrl(sitemapUrl), depth: 1, parentUrl: startUrl });
  }

  try {
    while (queue.length > 0 && pages.length < maxPages) {
      const { url, depth, parentUrl } = queue.shift()!;
      const normalized = normalizeUrl(url);

      if (visited.has(normalized) || depth > maxDepth) continue;
      visited.add(normalized);
      discoveredUrls.add(normalized);

      if (respectRobots && !isAllowedByRobots(new URL(normalized).pathname, disallowedPaths)) continue;

      const page = await context.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });

      const pageEndpoints: EndpointExtract[] = [];
      const pageAssets: { url: string; type: import('@surface/shared').AssetType; discoveredFrom?: string }[] = [];

      page.on('request', (req) => {
        const reqUrl = req.url();
        if (!isHttpUrl(reqUrl)) return;
        const assetType = determineAssetType(reqUrl, req.resourceType());
        if (assetType) {
          pageAssets.push({ url: normalizeUrl(reqUrl), type: assetType, discoveredFrom: normalized });
        } else if (isPotentialEndpoint(reqUrl)) {
          pageEndpoints.push({
            url: normalizeUrl(reqUrl),
            method: req.method(),
            type: EndpointType.UNKNOWN,
            discoveredFrom: normalized,
          });
        }
      });

      page.on('response', (res) => {
        const req = res.request();
        const reqUrl = req.url();
        const contentType = (res.headers()['content-type'] || '').toLowerCase();
        const statusCode = res.status();
        const ep = pageEndpoints.find((e) => e.url === normalizeUrl(reqUrl) && e.method === req.method());
        if (ep) {
          ep.contentType = contentType;
          ep.statusCode = statusCode;
          if (isGraphQLEndpoint(reqUrl, contentType)) ep.type = EndpointType.GRAPHQL;
          else if (isRestEndpoint(reqUrl, contentType)) ep.type = EndpointType.REST;
          else if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') ep.type = EndpointType.REST;
          else ep.type = classifyEndpointType(reqUrl, contentType);
        }
      });

      let response = null;
      try {
        response = await page.goto(normalized, { waitUntil: 'networkidle', timeout });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Navigation failed for ${normalized}: ${message}`);
        await page.close();
        continue;
      }

      const title = await page.title().catch(() => undefined);
      const headers = response?.headers() || {};
      const cookies = await context
        .cookies(normalized)
        .then((arr) => arr.map((c) => `${c.name}=${c.value}`))
        .catch(() => []);

      const screenshotPath = join(screenshotDir, `scan-${Date.now()}-${pages.length}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => undefined);

      const links = await extractLinks(page, normalized);
      const forms = await extractForms(page, normalized);
      const domAssets = await extractAssets(page, normalized);
      const html = await page.content().catch(() => '');
      const jsRoutes = extractJsRoutes(html, normalized);

      const pageExtract: PageExtract = {
        url: normalized,
        title,
        statusCode: response?.status() || 0,
        contentType: headers['content-type'],
        headers: flattenHeaders(headers),
        cookies,
        extractedLinks: [...new Set([...links, ...jsRoutes])],
        forms,
        endpoints: dedupeEndpoints(pageEndpoints),
        assets: dedupeAssets([...domAssets, ...pageAssets]),
        screenshotPath,
        depth,
        parentUrl,
      };

      pages.push(pageExtract);
      allEndpoints.push(...pageExtract.endpoints);
      allAssets.push(...pageExtract.assets);

      for (const link of pageExtract.extractedLinks) {
        try {
          if (sameOriginOnly && !sameOrigin(startUrl, link)) continue;
          if (visited.has(link)) continue;
          if (respectRobots && !isAllowedByRobots(new URL(link).pathname, disallowedPaths)) continue;
          queue.push({ url: link, depth: depth + 1, parentUrl: normalized });
        } catch { /* ignore malformed links */ }
      }

      await page.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Crawler loop error: ${message}`);
  } finally {
    await context.close();
    await browser.close();
  }

  return {
    startUrl: normalizeUrl(startUrl),
    pages,
    forms: pages.flatMap((p) => p.forms),
    endpoints: dedupeEndpoints(allEndpoints),
    assets: dedupeAssets(allAssets),
    discoveredUrls: [...discoveredUrls],
    errors,
    durationMs: Date.now() - start,
  };
}
