'use client';

import { ScanDetailsDto, ScanDiffDto, ScanStatsDto } from '@surface/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCards } from '@/components/stats-cards';
import { TechStack } from '@/components/tech-stack';
import { PagesTable } from '@/components/pages-table';
import { FormsTable } from '@/components/forms-table';
import { ApisTable } from '@/components/apis-table';
import { AssetsTable } from '@/components/assets-table';
import { RisksTable } from '@/components/risks-table';
import { VulnsTable } from '@/components/vulns-table';
import { Screenshots } from '@/components/screenshots';
import { ReportsList } from '@/components/reports-list';
import { ScanDiff } from '@/components/scan-diff';
import { ScanStatusBadge } from '@/components/scan-status-badge';

export function ScanTabs({ scan, stats, diff }: { scan: ScanDetailsDto; stats: ScanStatsDto; diff: ScanDiffDto }) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-6">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="pages">Pages</TabsTrigger>
        <TabsTrigger value="forms">Forms</TabsTrigger>
        <TabsTrigger value="apis">APIs</TabsTrigger>
        <TabsTrigger value="assets">Assets</TabsTrigger>
        <TabsTrigger value="risks">Risks</TabsTrigger>
        <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
        <TabsTrigger value="changes">Changes</TabsTrigger>
        <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="mb-6 rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{scan.url}</h2>
              <p className="text-sm text-muted">
                {scan.status} · {scan.durationMs}ms · {scan.pages.length} pages
              </p>
            </div>
            <ScanStatusBadge status={scan.status} />
          </div>
          {(scan.status === 'PENDING' || scan.status === 'RUNNING') && (
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-surface-elevated">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${scan.progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{scan.progress}%</p>
            </div>
          )}
        </div>
        <div className="mb-6">
          <StatsCards stats={stats} />
        </div>
        <TechStack stack={scan.techStack || []} />
      </TabsContent>

      <TabsContent value="pages">
        <PagesTable pages={scan.pages} />
      </TabsContent>

      <TabsContent value="forms">
        <FormsTable forms={scan.forms} />
      </TabsContent>

      <TabsContent value="apis">
        <ApisTable endpoints={scan.endpoints} />
      </TabsContent>

      <TabsContent value="assets">
        <AssetsTable assets={scan.assets} />
      </TabsContent>

      <TabsContent value="risks">
        <RisksTable risks={scan.risks} />
      </TabsContent>

      <TabsContent value="vulnerabilities">
        <VulnsTable vulns={scan.risks.filter((r) => r.source === 'DETECTED')} />
      </TabsContent>

      <TabsContent value="changes">
        <ScanDiff diff={diff} />
      </TabsContent>

      <TabsContent value="screenshots">
        <Screenshots pages={scan.pages} />
      </TabsContent>

      <TabsContent value="reports">
        <ReportsList scanId={scan.id} reports={scan.reports} />
      </TabsContent>
    </Tabs>
  );
}
