export enum ScanStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum EndpointType {
  REST = 'REST',
  GRAPHQL = 'GRAPHQL',
  JS_ROUTE = 'JS_ROUTE',
  STATIC = 'STATIC',
  UNKNOWN = 'UNKNOWN',
}

export enum AssetType {
  SCRIPT = 'SCRIPT',
  STYLESHEET = 'STYLESHEET',
  IMAGE = 'IMAGE',
  FONT = 'FONT',
  OTHER = 'OTHER',
}

export enum FunctionalityType {
  AUTH = 'AUTH',
  ADMIN = 'ADMIN',
  DASHBOARD = 'DASHBOARD',
  SEARCH = 'SEARCH',
  CRUD = 'CRUD',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  API = 'API',
  GRAPHQL = 'GRAPHQL',
  HIDDEN = 'HIDDEN',
}

export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum GraphNodeType {
  PAGE = 'PAGE',
  FORM = 'FORM',
  ENDPOINT = 'ENDPOINT',
  ASSET = 'ASSET',
  SCRIPT = 'SCRIPT',
  AUTH = 'AUTH',
  ADMIN = 'ADMIN',
  OBJECT = 'OBJECT',
}

export enum GraphEdgeType {
  NAVIGATION = 'NAVIGATION',
  API_CALL = 'API_CALL',
  FORM_ACTION = 'FORM_ACTION',
  JS_IMPORT = 'JS_IMPORT',
  RELATIONSHIP = 'RELATIONSHIP',
}

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  sameOrigin?: boolean;
  respectRobots?: boolean;
  includeSitemap?: boolean;
  screenshotDir?: string;
  browserHeadless?: boolean;
  browserTimeout?: number;
  /** Maximum time a single scan is allowed to run, in minutes. */
  maxDurationMin?: number;
}

/**
 * Runtime hooks for the crawler. These are NOT part of CrawlOptions because
 * options are serialized into the job queue; hooks are wired by the worker.
 */
export interface CrawlHooks {
  /** Called after each page is fully processed. */
  onProgress?: (pagesCrawled: number, maxPages: number) => void | Promise<void>;
  /** Return true to stop the crawl gracefully (partial results are returned). */
  shouldAbort?: () => boolean | Promise<boolean>;
}

export interface FieldExtract {
  name?: string;
  type?: string;
  selector?: string;
  required?: boolean;
  placeholder?: string;
}

export interface FormExtract {
  action?: string;
  method?: string;
  selector?: string;
  id?: string;
  fields: FieldExtract[];
  buttons: string[];
}

export interface EndpointExtract {
  url: string;
  method?: string;
  type: EndpointType;
  discoveredFrom?: string;
  contentType?: string;
  statusCode?: number;
}

export interface AssetExtract {
  url: string;
  type: AssetType;
  discoveredFrom?: string;
}

export interface PageExtract {
  url: string;
  title?: string;
  statusCode?: number;
  contentType?: string;
  headers: Record<string, string>;
  cookies: string[];
  extractedLinks: string[];
  forms: FormExtract[];
  endpoints: EndpointExtract[];
  assets: AssetExtract[];
  screenshotPath?: string;
  depth: number;
  parentUrl?: string;
}

export interface CrawlResult {
  startUrl: string;
  pages: PageExtract[];
  forms: FormExtract[];
  endpoints: EndpointExtract[];
  assets: AssetExtract[];
  discoveredUrls: string[];
  errors: string[];
  durationMs: number;
}

export interface PageClassification {
  url: string;
  title?: string;
  functionality: FunctionalityType[];
  confidence: number;
  reasoning?: string;
}

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  data: Record<string, unknown>;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: GraphEdgeType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RiskPattern {
  functionality: string;
  risks: {
    title: string;
    owasp: string;
    cwe: string;
    severity: Severity;
    description: string;
  }[];
}

export interface RiskKnowledgeBase {
  patterns: RiskPattern[];
}

export type RiskSource = 'HEURISTIC' | 'DETECTED';

export interface RiskDto {
  id?: string;
  category: string;
  description: string;
  owasp?: string;
  cwe?: string;
  severity: Severity;
  evidence: string;
  source?: RiskSource;
  url?: string;
  remediation?: string;
}

export interface CreateScanDto {
  url: string;
  options?: CrawlOptions;
  /** Re-run the scan automatically every N minutes (minimum 15). */
  recurringIntervalMin?: number;
}

export interface ScanDto {
  id: string;
  url: string;
  status: ScanStatus;
  progress: number;
  recurringIntervalMin?: number;
  createdAt: string;
  updatedAt: string;
}

/** What changed between a scan and the previous completed scan of the same URL. */
export interface ScanDiffDto {
  previousScanId: string | null;
  previousScanAt?: string;
  pagesAdded: string[];
  pagesRemoved: string[];
  endpointsAdded: string[];
  endpointsRemoved: string[];
  vulnsAdded: string[];
  vulnsResolved: string[];
}

export interface ScanDetailsDto extends ScanDto {
  pages: PageExtract[];
  forms: FormExtract[];
  endpoints: EndpointExtract[];
  assets: AssetExtract[];
  classifications: PageClassification[];
  graph: GraphData;
  risks: RiskDto[];
  reports: ReportDto[];
  errors: string[];
  durationMs: number;
  techStack?: string[];
}

export interface ReportDto {
  id: string;
  scanId: string;
  format: 'PDF' | 'MARKDOWN' | 'JSON';
  path: string;
  createdAt: string;
}

export interface ScanStatsDto {
  pages: number;
  forms: number;
  endpoints: number;
  assets: number;
  risks: number;
  vulnerabilities: number;
  riskScore: number;
  authPages: number;
  adminPages: number;
  apiEndpoints: number;
  graphqlEndpoints: number;
  techStack: string[];
}

export interface QueueJobData {
  scanId: string;
  url: string;
  options: CrawlOptions;
}
