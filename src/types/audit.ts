/**
 * Karen Audit Result Types
 */

import type { AuditFeature, IssueSeverity, Viewport } from './config.js';

export interface ElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DOMElement {
  selector: string;
  tagName: string;
  classes: string[];
  id: string;
  rect: ElementRect;
  computedStyle: Record<string, string>;
  children: DOMElement[];
}

export interface LayoutMetrics {
  totalElements: number;
  visibleElements: number;
  overflowingElements: number;
  performanceScore: number;
}

export interface ViewportSnapshot {
  viewport: Viewport;
  screenshot: string;
  dom: DOMElement[];
  styles: Record<string, Record<string, string>>;
  metrics: LayoutMetrics;
  errors: string[];
}

export interface IssueFix {
  file: string;
  before: string;
  after: string;
  explanation?: string;
}

export interface Issue {
  id: string;
  type: AuditFeature;
  severity: IssueSeverity;
  viewport: string;
  element: string;
  message: string;
  details: Record<string, unknown>;
  screenshot?: string;
  fix?: {
    suggestion: string;
    code?: IssueFix;
    affectedElements?: string[];
  };
}

export interface AuditSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<AuditFeature, number>;
  byViewport: Record<string, number>;
}

export interface AuditResult {
  meta: {
    siteUrl: string;
    auditDate: string;
    karenVersion: string;
    config: Record<string, unknown>;
  };
  summary: AuditSummary;
  issues: Issue[];
  artifacts: {
    screenshots: string[];
    fullViewportCaptures: Record<string, string>;
  };
}
