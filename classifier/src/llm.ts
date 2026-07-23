import axios from 'axios';
import { RiskDto } from '@surface/shared';

export interface LLMOptions {
  ollamaHost?: string;
  model?: string;
  timeoutMs?: number;
}

interface LLMRiskSuggestion {
  category: string;
  description: string;
  owasp?: string;
  cwe?: string;
  severity: string;
  evidence: string;
}

export async function summarizeWithLLM(
  summary: {
    url: string;
    pageCount: number;
    functionalities: string[];
    endpoints: { url: string; type: string }[];
    forms: { action?: string; method: string }[];
  },
  options: LLMOptions = {},
): Promise<RiskDto[] | null> {
  const host = options.ollamaHost || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  const model = options.model || process.env.OLLAMA_MODEL || 'gemma:2b';
  const timeoutMs = options.timeoutMs || 30000;

  // If OLLAMA_HOST is explicitly disabled or unreachable, skip LLM.
  if (process.env.DISABLE_LLM === 'true') return null;

  const prompt = buildPrompt(summary);

  try {
    const res = await axios.post(
      `${host}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        format: 'json',
      },
      { timeout: timeoutMs },
    );
    const text = res.data?.response || '';
    const suggestions = extractJSON<LLMRiskSuggestion[]>(text) || [];
    return suggestions
      .filter((s) => s.category && s.description)
      .map((s) => ({
        category: s.category,
        description: s.description,
        owasp: s.owasp,
        cwe: s.cwe,
        severity: normalizeSeverity(s.severity),
        evidence: s.evidence || 'Suggested by local LLM from existing heuristic classification.',
      }));
  } catch {
    return null;
  }
}

function buildPrompt(summary: {
  url: string;
  pageCount: number;
  functionalities: string[];
  endpoints: { url: string; type: string }[];
  forms: { action?: string; method: string }[];
}): string {
  return `You are a security assistant helping map discovered web application functionality to known OWASP Top 10 and CWE risks. You must NOT invent vulnerabilities that are not supported by the evidence below.

Target URL: ${summary.url}
Pages discovered: ${summary.pageCount}
Detected functionalities: ${summary.functionalities.join(', ')}
Discovered endpoints: ${summary.endpoints.map((e) => `${e.method || 'GET'} ${e.url} (${e.type})`).join(', ') || 'none'}
Discovered forms: ${summary.forms.map((f) => `${f.method} ${f.action || 'self'}`).join(', ') || 'none'}

Return ONLY a JSON array of risk objects. Each object must contain:
- category: short risk title
- description: one sentence explaining why this functionality maps to the risk
- owasp: an OWASP Top 10 2021 identifier (e.g., A07:2021-Identification and Authentication Failures)
- cwe: a CWE identifier (e.g., CWE-287)
- severity: one of CRITICAL, HIGH, MEDIUM, LOW, INFO
- evidence: one sentence referencing the discovered functionality

Do not invent risks. Only map to known OWASP Top 10 and CWE categories. If no risks apply, return an empty array.
`;
}

function normalizeSeverity(s?: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
  const upper = (s || 'INFO').toUpperCase();
  if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(upper)) {
    return upper as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  }
  return 'INFO';
}

function extractJSON<T>(text: string): T | null {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as T;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
