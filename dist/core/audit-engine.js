"use strict";
/**
 * Main Audit Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEngine = void 0;
const browser_js_1 = require("./browser.js");
const claude_js_1 = require("./claude.js");
const index_js_1 = require("../detectors/index.js");
const result_js_1 = require("./result.js");
const id_js_1 = require("../utils/id.js");
class AuditEngine {
    constructor(config) {
        this.config = config;
        if (config.anthropicApiKey) {
            this.claudeAnalyzer = new claude_js_1.ClaudeAnalyzer(config.anthropicApiKey);
        }
    }
    async runAudit(url) {
        try {
            (0, id_js_1.resetCounter)();
            // Phase 1: Capture all viewports
            const snapshotsResult = await (0, browser_js_1.captureAllViewports)(url, this.config);
            if (snapshotsResult.isErr()) {
                return (0, result_js_1.err)(snapshotsResult.error);
            }
            const snapshots = snapshotsResult.value;
            const allIssues = [];
            // Phase 2: Run code-based detectors
            if (this.config.features.includes('overflow')) {
                allIssues.push(...(0, index_js_1.detectOverflow)(snapshots, this.config));
            }
            if (this.config.features.includes('spacing')) {
                allIssues.push(...(0, index_js_1.analyzeSpacing)(snapshots, this.config));
            }
            if (this.config.features.includes('typescale')) {
                allIssues.push(...(0, index_js_1.enforceTypescale)(snapshots, this.config));
            }
            if (this.config.features.includes('accessibility')) {
                allIssues.push(...(0, index_js_1.checkAccessibility)(snapshots, this.config));
            }
            if (this.config.features.includes('colors')) {
                allIssues.push(...(0, index_js_1.analyzeColors)(snapshots, this.config));
            }
            if (this.config.features.includes('design-system')) {
                allIssues.push(...(0, index_js_1.detectDesignSystemChaos)(snapshots));
                allIssues.push(...(0, index_js_1.detectMisalignment)(snapshots, this.config));
                allIssues.push(...(0, index_js_1.enforceDesignTokens)(snapshots, this.config));
                allIssues.push(...(0, index_js_1.enforceResponsiveDesign)(snapshots, this.config));
            }
            // Phase 3: Run AI visual analysis (if enabled)
            if (this.claudeAnalyzer) {
                for (const snapshot of snapshots) {
                    const aiIssuesResult = await this.claudeAnalyzer.analyzeVisualIssues(snapshot.screenshot, snapshot.viewport);
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
                fullViewportCaptures: snapshots.reduce((acc, snapshot) => {
                    acc[snapshot.viewport.name] = snapshot.screenshot;
                    return acc;
                }, {}),
            };
            const result = {
                meta: {
                    siteUrl: url,
                    auditDate: new Date().toISOString(),
                    karenVersion: '1.0.0',
                    config: this.config,
                },
                summary,
                issues: allIssues,
                artifacts,
            };
            return (0, result_js_1.ok)(result);
        }
        catch (error) {
            return (0, result_js_1.err)(result_js_1.KarenError.unknown('Audit failed unexpectedly', error));
        }
    }
    buildSummary(issues) {
        const summary = {
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
                performance: 0,
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
exports.AuditEngine = AuditEngine;
