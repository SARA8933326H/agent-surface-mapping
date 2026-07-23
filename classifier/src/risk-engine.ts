import { FunctionalityType, PageClassification, RiskDto, RiskKnowledgeBase, Severity } from '@surface/shared';

export function matchRisks(classifications: PageClassification[], knowledgeBase: RiskKnowledgeBase): RiskDto[] {
  const risks: RiskDto[] = [];
  const seen = new Set<string>();

  for (const page of classifications) {
    for (const functionality of page.functionality) {
      const pattern = knowledgeBase.patterns.find((p) => p.functionality === functionality);
      if (!pattern) continue;
      for (const r of pattern.risks) {
        const evidence = `Discovered on ${page.url}${page.title ? ` (${page.title})` : ''} with heuristic evidence: ${page.reasoning || 'n/a'}`;
        const key = `${functionality}|${r.title}|${page.url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        risks.push({
          category: r.title,
          description: r.description,
          owasp: r.owasp,
          cwe: r.cwe,
          severity: r.severity as Severity,
          evidence,
        });
      }
    }
  }

  return risks;
}

export function computeRiskScore(risks: RiskDto[]): number {
  const weights: Record<Severity, number> = {
    [Severity.CRITICAL]: 10,
    [Severity.HIGH]: 7,
    [Severity.MEDIUM]: 4,
    [Severity.LOW]: 1,
    [Severity.INFO]: 0,
  };
  if (risks.length === 0) return 0;
  const raw = risks.reduce((sum, r) => sum + weights[r.severity], 0);
  const normalized = Math.min(100, Math.round((raw / (risks.length * 10)) * 100));
  return normalized;
}

export function uniqueFunctionalities(classifications: PageClassification[]): FunctionalityType[] {
  const set = new Set<FunctionalityType>();
  for (const c of classifications) {
    for (const f of c.functionality) set.add(f);
  }
  return [...set];
}

export function severityCounts(risks: RiskDto[]): Record<Severity, number> {
  const counts = {
    [Severity.CRITICAL]: 0,
    [Severity.HIGH]: 0,
    [Severity.MEDIUM]: 0,
    [Severity.LOW]: 0,
    [Severity.INFO]: 0,
  };
  for (const r of risks) counts[r.severity]++;
  return counts;
}
