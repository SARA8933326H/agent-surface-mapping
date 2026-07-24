import { Page, Response } from 'playwright';
import {
  AssetExtract,
  AssetType,
  EndpointExtract,
  EndpointType,
  FormExtract,
  PageExtract,
} from '@surface/shared';
import {
  classifyEndpointType,
  dedupeAssets,
  dedupeEndpoints,
  determineAssetType,
  extractAssets,
  extractForms,
  extractJsRoutes,
  extractLinks,
  isGraphQLEndpoint,
  isRestEndpoint,
} from './extractors';
import { flattenHeaders, isPotentialEndpoint, normalizeUrl } from './utils';

export interface PageAnalysis {
  page: PageExtract;
  endpoints: EndpointExtract[];
  assets: AssetExtract[];
}

export async function analyzePage(
  page: Page,
  response: Response | null,
  url: string,
  depth: number,
  parentUrl: string | undefined,
  screenshotPath: string,
  baseUrl: string,
): Promise<PageAnalysis> {
  const title = await page.title().catch(() => undefined);
  const headers = response?.headers() || {};
  const cookies = await page.context().cookies(url).then((arr) => arr.map((c) => `${c.name}=${c.value}`));

  const links = await extractLinks(page, url);
  const forms = await extractForms(page, url);
  const domAssets = await extractAssets(page, url);
  const html = await page.content().catch(() => '');
  const jsRoutes = extractJsRoutes(html, url);

  // Network endpoints captured by the caller are passed in here.
  const pageEndpoints: EndpointExtract[] = [];
  const pageAssets: AssetExtract[] = [];

  page.on('request', (req) => {
    const reqUrl = req.url();
    if (!reqUrl.startsWith('http')) return;
    const resourceType = req.resourceType();
    const assetType = determineAssetType(reqUrl, resourceType);
    if (assetType) {
      pageAssets.push({ url: normalizeUrl(reqUrl), type: assetType, discoveredFrom: url });
    } else if (isPotentialEndpoint(reqUrl)) {
      pageEndpoints.push({
        url: normalizeUrl(reqUrl),
        method: req.method(),
        type: EndpointType.UNKNOWN,
        discoveredFrom: url,
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
      else ep.type = EndpointType.STATIC;
    }
  });

  const pageExtract: PageExtract = {
    url,
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

  return { page: pageExtract, endpoints: pageExtract.endpoints, assets: pageExtract.assets };
}

export function mergePageEndpoints(pages: PageExtract[]): EndpointExtract[] {
  const all: EndpointExtract[] = [];
  for (const p of pages) all.push(...p.endpoints);
  return dedupeEndpoints(all);
}

export function mergePageAssets(pages: PageExtract[]): AssetExtract[] {
  const all: AssetExtract[] = [];
  for (const p of pages) all.push(...p.assets);
  return dedupeAssets(all);
}

export function assetTypeFromUrl(url: string): AssetType {
  const lower = url.toLowerCase();
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return AssetType.SCRIPT;
  if (lower.endsWith('.css')) return AssetType.STYLESHEET;
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(lower)) return AssetType.IMAGE;
  if (/\.(woff2?|ttf|otf|eot)$/.test(lower)) return AssetType.FONT;
  return AssetType.OTHER;
}
