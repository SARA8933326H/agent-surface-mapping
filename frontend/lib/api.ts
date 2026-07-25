import { CreateScanDto, ReportDto, ScanDetailsDto, ScanDto, ScanStatsDto } from '@surface/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

function authHeaders(): Record<string, string> {
  return API_KEY ? { 'X-API-Key': API_KEY } : {};
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function listScans(): Promise<ScanDto[]> {
  return fetchJson('/scans');
}

export async function getScan(id: string): Promise<ScanDetailsDto> {
  return fetchJson(`/scans/${id}`);
}

export async function getScanStats(id: string): Promise<ScanStatsDto> {
  return fetchJson(`/scans/${id}/stats`);
}

export async function createScan(dto: CreateScanDto): Promise<ScanDto> {
  return fetchJson('/scans', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function generateReport(scanId: string, format: 'PDF' | 'MARKDOWN' | 'JSON'): Promise<ReportDto> {
  return fetchJson<ReportDto>(`/reports/scans/${scanId}/${format.toLowerCase()}`, { method: 'POST' });
}

export function reportDownloadUrl(reportId: string): string {
  const key = API_KEY ? `?key=${encodeURIComponent(API_KEY)}` : '';
  return `${API_URL}/reports/${reportId}/download${key}`;
}
