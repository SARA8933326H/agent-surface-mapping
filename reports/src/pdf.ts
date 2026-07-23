import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { ScanDetailsDto } from '@surface/shared';
import { buildReportHtml } from './template';

export async function generatePdfReport(scan: ScanDetailsDto, outputPath: string): Promise<string> {
  await mkdir(dirname(outputPath), { recursive: true });
  const html = buildReportHtml(scan);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
  await browser.close();
  return outputPath;
}

export async function generateHtmlReport(scan: ScanDetailsDto, outputPath: string): Promise<string> {
  await mkdir(dirname(outputPath), { recursive: true });
  const html = buildReportHtml(scan);
  await writeFile(outputPath, html, 'utf-8');
  return outputPath;
}
