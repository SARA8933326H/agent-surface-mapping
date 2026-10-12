import { ScanDetailsDto } from '@surface/shared';

export async function generateAiReport(scan: ScanDetailsDto): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const ollamaHost = process.env.OLLAMA_HOST || (process.env.DISABLE_LLM !== 'true' ? 'http://127.0.0.1:11434' : undefined);

  if (!geminiApiKey && (!ollamaHost || process.env.DISABLE_LLM === 'true')) {
    throw new Error('No AI provider configured. Set GEMINI_API_KEY in your .env or run local Ollama to generate AI reports.');
  }

  // Summarize the scan data to avoid token limits
  const summary = {
    url: scan.url,
    status: scan.status,
    durationMs: scan.durationMs,
    pageCount: scan.pages.length,
    formCount: scan.forms.length,
    endpointCount: scan.endpoints.length,
    assetCount: scan.assets.length,
    techStack: scan.techStack || [],
    risks: scan.risks.map((r) => ({
      category: r.category,
      severity: r.severity,
      description: r.description,
      source: r.source,
      evidence: r.evidence,
      owasp: r.owasp,
      cwe: r.cwe,
    })),
  };

  const prompt = `You are an expert cybersecurity analyst. Generate a professional, highly structured executive report for a web application attack surface discovery scan. Use Markdown.
Here is the data from the scan:
${JSON.stringify(summary, null, 2)}

The report should include:
1. Executive Summary (overall risk posture, score assessment, key findings).
2. Technology Stack & Attack Surface Overview (discovered pages, forms, APIs, and technologies).
3. Detailed Risk & Vulnerability Analysis (categorized by OWASP Top 10, CWE, and severity).
4. Strategic Remediation Roadmap (concrete, prioritized remediation guidance).

Keep the report concise, professional, actionable, and formatted in clean Markdown.`;

  if (geminiApiKey) {
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini API returned an empty response.');
    }
    return text;
  } else if (ollamaHost) {
    const model = process.env.OLLAMA_MODEL || 'gemma:2b';
    const response = await fetch(`${ollamaHost}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const text = data?.response;
    if (!text) {
      throw new Error('Ollama returned an empty response.');
    }
    return text;
  }

  throw new Error('No AI provider available.');
}
