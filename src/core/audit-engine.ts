/**
 * Main Audit Engine
 */

import type { KarenConfig } from '../types/config.js';
import type { AuditResult, Issue, AuditSummary } from '../types/audit.js';
import { captureAllViewports } from './browser.js';
import { ClaudeAnalyzer } from './claude.js';
import {
  detectOverflow,
  analyzeSpacing,
  enforceTypescale,
  checkAccessibility,
  analyzeColors,
  detectDesignSystemChaos,
  enforceDesignTokens,
  detectMisalignment,
  enforceResponsiveDesign,
} from '../detectors/index.js';
import { type KarenResult, ok, err, KarenError } from './result.js';
import { resetCounter } from '../utils/id.js';

export class AuditEngine {
  private config: KarenConfig;
  private claudeAnalyzer?: ClaudeAnalyzer;

  constructor(config: KarenConfig) {
    this.config = config;

    if (config.anthropicApiKey) {
      this.claudeAnalyzer = new ClaudeAnalyzer(config.anthropicApiKey);
    }
  }

  async runAudit(url: string): Promise<KarenResult<AuditResult>> {
    try {
      resetCounter();

      // Phase 1: Capture all viewports
      const snapshotsResult = await captureAllViewports(url, this.config);
      if (snapshotsResult.isErr()) {
        return err(snapshotsResult.error);
      }

      const snapshots = snapshotsResult.value;
      const allIssues: Issue[] = [];

      // Phase 2: Run code-based detectors
      if (this.config.features.includes('overflow')) {
        allIssues.push(...detectOverflow(snapshots, this.config));
      }

      if (this.config.features.includes('spacing')) {
        allIssues.push(...analyzeSpacing(snapshots, this.config));
      }

      if (this.config.features.includes('typescale')) {
        allIssues.push(...enforceTypescale(snapshots, this.config));
      }

      if (this.config.features.includes('accessibility')) {
        allIssues.push(...checkAccessibility(snapshots, this.config));
      }

      if (this.config.features.includes('colors')) {
        allIssues.push(...analyzeColors(snapshots, this.config));
      }

      if (this.config.features.includes('design-system')) {
        allIssues.push(...detectDesignSystemChaos(snapshots));
        allIssues.push(...detectMisalignment(snapshots, this.config));
        allIssues.push(...enforceDesignTokens(snapshots, this.config));
        allIssues.push(...enforceResponsiveDesign(snapshots, this.config));
      }

      // Phase 3: Run AI visual analysis (if enabled)
      if (this.claudeAnalyzer) {
        for (const snapshot of snapshots) {
          const aiIssuesResult = await this.claudeAnalyzer.analyzeVisualIssues(
            snapshot.screenshot,
            snapshot.viewport
          );

          if (aiIssuesResult.isOk()) {
            allIssues.push(...aiIssuesResult.value);
          }
        }
      }

      // Phase 4: Build summary
      const summary = this.buildSummary(allIssues);

      // Phase 5: Collect artifacts
      const artifacts = {
        screenshots: allIssues
          .filter((issue) => issue.screenshot)
          .map((issue) => issue.id),
        fullViewportCaptures: snapshots.reduce(
          (acc, snapshot) => {
            acc[snapshot.viewport.name] = snapshot.screenshot;
            return acc;
          },
          {} as Record<string, string>
        ),
      };

      const result: AuditResult = {
        meta: {
          siteUrl: url,
          auditDate: new Date().toISOString(),
          karenVersion: '1.0.0',
          config: this.config as any,
        },
        summary,
        issues: allIssues,
        artifacts,
      };

      return ok(result);
    } catch (error) {
      return err(KarenError.unknown('Audit failed unexpectedly', error));
    }
  }

  private buildSummary(issues: Issue[]): AuditSummary {
    const summary: AuditSummary = {
      total: issues.length,
      critical: issues.filter((i) => i.severity === 'critical').length,
      high: issues.filter((i) => i.severity === 'high').length,
      medium: issues.filter((i) => i.severity === 'medium').length,
      low: issues.filter((i) => i.severity === 'low').length,
      byType: {
        overflow: 0,
        spacing: 0,
        typescale: 0,
        colors: 0,
        accessibility: 0,
        'design-system': 0,
      },
      byViewport: {},
    };

    for (const issue of issues) {
      summary.byType[issue.type]++;

      if (!summary.byViewport[issue.viewport]) {
        summary.byViewport[issue.viewport] = 0;
      }
      summary.byViewport[issue.viewport]++;
    }

    return summary;
  }
}
