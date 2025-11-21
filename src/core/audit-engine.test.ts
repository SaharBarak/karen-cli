import { describe, it, expect, beforeEach } from 'vitest';
import { AuditEngine } from './audit-engine.js';
import { defaultConfig } from '../types/config.js';

describe('AuditEngine', () => {
  let engine: AuditEngine;

  beforeEach(() => {
    const config = {
      ...defaultConfig,
      anthropicApiKey: undefined, // Disable AI for tests
    };
    engine = new AuditEngine(config);
  });

  describe('buildSummary', () => {
    it('should build correct summary from issues', () => {
      const issues = [
        {
          id: '1',
          type: 'overflow' as const,
          severity: 'critical' as const,
          viewport: 'mobile',
          element: '.test',
          message: 'test',
          details: {},
        },
        {
          id: '2',
          type: 'spacing' as const,
          severity: 'high' as const,
          viewport: 'mobile',
          element: '.test',
          message: 'test',
          details: {},
        },
        {
          id: '3',
          type: 'overflow' as const,
          severity: 'medium' as const,
          viewport: 'desktop',
          element: '.test',
          message: 'test',
          details: {},
        },
      ];

      const summary = (engine as any).buildSummary(issues);

      expect(summary.total).toBe(3);
      expect(summary.critical).toBe(1);
      expect(summary.high).toBe(1);
      expect(summary.medium).toBe(1);
      expect(summary.low).toBe(0);
      expect(summary.byType.overflow).toBe(2);
      expect(summary.byType.spacing).toBe(1);
      expect(summary.byViewport.mobile).toBe(2);
      expect(summary.byViewport.desktop).toBe(1);
    });

    it('should handle empty issues array', () => {
      const summary = (engine as any).buildSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.critical).toBe(0);
      expect(summary.high).toBe(0);
      expect(summary.medium).toBe(0);
      expect(summary.low).toBe(0);
    });
  });
});
