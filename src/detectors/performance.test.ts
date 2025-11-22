/**
 * Tests for Performance Detector
 */

import { describe, it, expect } from 'vitest';
import { detectPerformance } from './performance';
import type { ViewportSnapshot } from '../types/audit';
import { defaultConfig } from '../types/config';

describe('Performance Detector', () => {
  const baseSnapshot: ViewportSnapshot = {
    viewport: { name: 'Desktop HD', width: 1920, height: 1080 },
    screenshot: 'screenshot-url.png',
    dom: [],
    styles: {},
    metrics: {
      totalElements: 100,
      visibleElements: 95,
      overflowingElements: 0,
      performanceScore: 100,
    },
    errors: [],
  };

  describe('LCP (Largest Contentful Paint)', () => {
    it('should detect slow LCP > 4000ms as critical', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          lcp: 5000, // 5 seconds
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const lcpIssue = issues.find((i) => i.details.metric === 'LCP');
      expect(lcpIssue).toBeDefined();
      expect(lcpIssue?.severity).toBe('critical');
      expect(lcpIssue?.details.value).toBe(5000);
      expect(lcpIssue?.message).toMatch(/5\.00|LCP/); // Check LCP or duration mentioned
    });

    it('should detect LCP between 2500-4000ms as high', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          lcp: 3000,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const lcpIssue = issues.find((i) => i.details.metric === 'LCP');
      expect(lcpIssue).toBeDefined();
      expect(lcpIssue?.severity).toBe('high');
    });

    it('should not report LCP < 2500ms', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          lcp: 2000,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const lcpIssue = issues.find((i) => i.details.metric === 'LCP');
      expect(lcpIssue).toBeUndefined();
    });

    it('should include fix suggestions for LCP', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          lcp: 3500,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const lcpIssue = issues.find((i) => i.details.metric === 'LCP');
      expect(lcpIssue?.fix?.suggestion).toContain('preload');
      expect(lcpIssue?.fix?.code?.after).toContain('preload');
    });
  });

  describe('CLS (Cumulative Layout Shift)', () => {
    it('should detect CLS > 0.25 as critical', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          cls: 0.3,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const clsIssue = issues.find((i) => i.details.metric === 'CLS');
      expect(clsIssue).toBeDefined();
      expect(clsIssue?.severity).toBe('critical');
      expect(clsIssue?.details.value).toBe(0.3);
    });

    it('should detect CLS between 0.1-0.25 as high', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          cls: 0.15,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const clsIssue = issues.find((i) => i.details.metric === 'CLS');
      expect(clsIssue).toBeDefined();
      expect(clsIssue?.severity).toBe('high');
    });

    it('should not report CLS < 0.1', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          cls: 0.05,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const clsIssue = issues.find((i) => i.details.metric === 'CLS');
      expect(clsIssue).toBeUndefined();
    });

    it('should suggest image dimensions to fix CLS', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          cls: 0.2,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const clsIssue = issues.find((i) => i.details.metric === 'CLS');
      expect(clsIssue?.fix?.code?.after).toContain('aspect-ratio');
      expect(clsIssue?.fix?.code?.after).toContain('width');
      expect(clsIssue?.fix?.code?.after).toContain('height');
    });
  });

  describe('INP (Interaction to Next Paint)', () => {
    it('should detect INP > 500ms as critical', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          inp: 600,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const inpIssue = issues.find((i) => i.details.metric === 'INP');
      expect(inpIssue).toBeDefined();
      expect(inpIssue?.severity).toBe('critical');
    });

    it('should detect INP between 200-500ms as high', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          inp: 300,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const inpIssue = issues.find((i) => i.details.metric === 'INP');
      expect(inpIssue).toBeDefined();
      expect(inpIssue?.severity).toBe('high');
    });

    it('should not report INP < 200ms', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          inp: 150,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const inpIssue = issues.find((i) => i.details.metric === 'INP');
      expect(inpIssue).toBeUndefined();
    });

    it('should suggest web workers for slow INP', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          inp: 400,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const inpIssue = issues.find((i) => i.details.metric === 'INP');
      expect(inpIssue?.fix?.code?.after).toContain('requestIdleCallback');
      expect(inpIssue?.fix?.code?.after).toContain('Worker');
    });
  });

  describe('TTFB (Time to First Byte)', () => {
    it('should detect TTFB > 1800ms as critical', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          ttfb: 2000,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const ttfbIssue = issues.find((i) => i.details.metric === 'TTFB');
      expect(ttfbIssue).toBeDefined();
      expect(ttfbIssue?.severity).toBe('critical');
    });

    it('should detect TTFB between 600-1800ms as high', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          ttfb: 1000,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const ttfbIssue = issues.find((i) => i.details.metric === 'TTFB');
      expect(ttfbIssue).toBeDefined();
      expect(ttfbIssue?.severity).toBe('high');
    });

    it('should not report TTFB < 600ms', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          ttfb: 400,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const ttfbIssue = issues.find((i) => i.details.metric === 'TTFB');
      expect(ttfbIssue).toBeUndefined();
    });

    it('should suggest CDN and caching for slow TTFB', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          ttfb: 1500,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const ttfbIssue = issues.find((i) => i.details.metric === 'TTFB');
      expect(ttfbIssue?.fix?.suggestion).toContain('CDN');
      expect(ttfbIssue?.fix?.suggestion).toContain('caching');
    });
  });

  describe('Images Without Dimensions', () => {
    it('should detect images without dimensions', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          imagesWithoutDimensions: 5,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const imageIssue = issues.find((i) => i.details.issue === 'images-without-dimensions');
      expect(imageIssue).toBeDefined();
      expect(imageIssue?.severity).toBe('high');
      expect(imageIssue?.details.count).toBe(5);
    });

    it('should not report when all images have dimensions', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          imagesWithoutDimensions: 0,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const imageIssue = issues.find((i) => i.details.issue === 'images-without-dimensions');
      expect(imageIssue).toBeUndefined();
    });

    it('should provide fix with width/height attributes', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          imagesWithoutDimensions: 3,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const imageIssue = issues.find((i) => i.details.issue === 'images-without-dimensions');
      expect(imageIssue?.fix?.code?.after).toContain('width=');
      expect(imageIssue?.fix?.code?.after).toContain('height=');
    });
  });

  describe('Render-Blocking Resources', () => {
    it('should detect render-blocking resources', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          renderBlockingResources: 8,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const blockingIssue = issues.find((i) => i.details.issue === 'render-blocking-resources');
      expect(blockingIssue).toBeDefined();
      expect(blockingIssue?.severity).toBe('high');
      expect(blockingIssue?.details.count).toBe(8);
    });

    it('should suggest async/defer for render-blocking scripts', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          renderBlockingResources: 5,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const blockingIssue = issues.find((i) => i.details.issue === 'render-blocking-resources');
      expect(blockingIssue?.fix?.code?.after).toContain('defer');
      expect(blockingIssue?.fix?.code?.after).toContain('preload');
    });
  });

  describe('Font Loading Issues', () => {
    it('should detect font loading issues', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          fontLoadingIssues: 3,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const fontIssue = issues.find((i) => i.details.issue === 'font-loading');
      expect(fontIssue).toBeDefined();
      expect(fontIssue?.severity).toBe('medium');
      expect(fontIssue?.details.count).toBe(3);
    });

    it('should suggest font-display: swap', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          fontLoadingIssues: 2,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const fontIssue = issues.find((i) => i.details.issue === 'font-loading');
      expect(fontIssue?.fix?.code?.after).toContain('font-display: swap');
      expect(fontIssue?.fix?.code?.after).toContain('preload');
    });
  });

  describe('Multiple Issues', () => {
    it('should detect multiple performance issues simultaneously', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          lcp: 3500,
          cls: 0.2,
          inp: 350,
          ttfb: 1000,
          imagesWithoutDimensions: 4,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      expect(issues).toHaveLength(5); // All 5 issues detected
      expect(issues.find((i) => i.details.metric === 'LCP')).toBeDefined();
      expect(issues.find((i) => i.details.metric === 'CLS')).toBeDefined();
      expect(issues.find((i) => i.details.metric === 'INP')).toBeDefined();
      expect(issues.find((i) => i.details.metric === 'TTFB')).toBeDefined();
      expect(issues.find((i) => i.details.issue === 'images-without-dimensions')).toBeDefined();
    });
  });

  describe('Karen Roasts', () => {
    it('should include sassy Karen messages', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          lcp: 5000,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const lcpIssue = issues.find((i) => i.details.metric === 'LCP');
      expect(lcpIssue?.message).toMatch(/Karen|sweetie|honey/i);
    });

    it('should have unique roasts for different issues', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          lcp: 5000,
          cls: 0.3,
          inp: 600,
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      const messages = issues.map((i) => i.message);
      const uniqueMessages = new Set(messages);

      // Should have multiple unique messages
      expect(uniqueMessages.size).toBe(issues.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle snapshot without performance metrics', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          totalElements: 100,
          visibleElements: 95,
          overflowingElements: 0,
          performanceScore: 100,
          // No performance metrics
        },
      };

      const issues = detectPerformance([snapshot], defaultConfig);

      expect(issues).toHaveLength(0);
    });

    it('should handle undefined metrics gracefully', () => {
      const snapshot: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          totalElements: 100,
          visibleElements: 95,
          overflowingElements: 0,
          performanceScore: 100,
        },
      };

      expect(() => detectPerformance([snapshot], defaultConfig)).not.toThrow();
    });

    it('should process multiple viewports', () => {
      const mobile: ViewportSnapshot = {
        ...baseSnapshot,
        viewport: { name: 'Mobile', width: 375, height: 667 },
        metrics: {
          ...baseSnapshot.metrics,
          lcp: 3000,
        },
      };

      const desktop: ViewportSnapshot = {
        ...baseSnapshot,
        metrics: {
          ...baseSnapshot.metrics,
          cls: 0.2,
        },
      };

      const issues = detectPerformance([mobile, desktop], defaultConfig);

      expect(issues).toHaveLength(2);
      expect(issues[0].viewport).toBe('Mobile');
      expect(issues[1].viewport).toBe('Desktop HD');
    });
  });
});
