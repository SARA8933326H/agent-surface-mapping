import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PageClassification, RiskDto, RiskKnowledgeBase } from '@surface/shared';
import { matchRisks } from '@surface/classifier';

@Injectable()
export class RiskService {
  private knowledgeBase: RiskKnowledgeBase;

  constructor() {
    const path = join(__dirname, '../../../knowledge-base/risk-patterns.json');
    this.knowledgeBase = JSON.parse(readFileSync(path, 'utf-8')) as RiskKnowledgeBase;
  }

  matchKnownRisks(classifications: PageClassification[]): RiskDto[] {
    return matchRisks(classifications, this.knowledgeBase);
  }
}
