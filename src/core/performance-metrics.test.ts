/**
 * Tests for Performance Metrics Collection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculatePerformanceScore } from './performance-metrics';
import type { PerformanceMetrics } from '../detectors/performance';

describe('Performance Metrics Collection', () => {
  describe('calculatePerformanceScore', () => {
    it('should return 100 for perfect metrics', () => {
      const metrics: PerformanceMetrics = {
        lcp: 2000, // Good (< 2.5s)
        cls: 0.05, // Good (< 0.1)
        inp: 150, // Good (< 200ms)
        ttfb: 400, // Good (< 600ms)
        fcp: 1500, // Good (< 1.8s)
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBe(100);
    });

    it('should penalize poor LCP', () => {
      const metrics: PerformanceMetrics = {
        lcp: 5000, // Poor (> 4s)
        cls: 0.05,
        inp: 150,
        ttfb: 400,
        fcp: 1500,
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should penalize poor CLS', () => {
      const metrics: PerformanceMetrics = {
        lcp: 2000,
        cls: 0.3, // Poor (> 0.25)
        inp: 150,
        ttfb: 400,
        fcp: 1500,
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should penalize poor INP', () => {
      const metrics: PerformanceMetrics = {
        lcp: 2000,
        cls: 0.05,
        inp: 600, // Poor (> 500ms)
        ttfb: 400,
        fcp: 1500,
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should penalize poor TTFB', () => {
      const metrics: PerformanceMetrics = {
        lcp: 2000,
        cls: 0.05,
        inp: 150,
        ttfb: 2000, // Poor (> 1.8s)
        fcp: 1500,
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing metrics gracefully', () => {
      const metrics: PerformanceMetrics = {
        lcp: 2000,
        // Other metrics undefined
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return very low score for extremely poor metrics', () => {
      const metrics: PerformanceMetrics = {
        lcp: 10000, // Terrible
        cls: 1.0, // Terrible
        inp: 2000, // Terrible
        ttfb: 5000, // Terrible
        fcp: 10000, // Terrible
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeLessThanOrEqual(10); // Very poor
    });

    it('should weight LCP heavily (25%)', () => {
      const goodMetrics: PerformanceMetrics = {
        lcp: 2000,
        cls: 0.05,
        inp: 150,
        ttfb: 400,
      };

      const badLCP: PerformanceMetrics = {
        lcp: 5000,
        cls: 0.05,
        inp: 150,
        ttfb: 400,
      };

      const goodScore = calculatePerformanceScore(goodMetrics);
      const badScore = calculatePerformanceScore(badLCP);

      expect(goodScore).toBeGreaterThan(badScore); // Good LCP should score higher
      expect(goodScore - badScore).toBeGreaterThanOrEqual(15); // Significant difference
    });

    it('should use FID if INP not available', () => {
      const metrics: PerformanceMetrics = {
        lcp: 2000,
        cls: 0.05,
        fid: 150, // Using FID instead of INP
        ttfb: 400,
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBe(100);
    });

    it('should prefer INP over FID when both available', () => {
      const metrics: PerformanceMetrics = {
        lcp: 2000,
        cls: 0.05,
        inp: 150, // Good
        fid: 600, // Poor - should be ignored
        ttfb: 400,
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBe(100); // Should use INP (150), not FID (600)
    });

    it('should handle needs-improvement thresholds', () => {
      const metrics: PerformanceMetrics = {
        lcp: 3000, // Needs improvement (2.5s < x < 4s)
        cls: 0.15, // Needs improvement (0.1 < x < 0.25)
        inp: 300, // Needs improvement (200ms < x < 500ms)
        ttfb: 1000, // Needs improvement (600ms < x < 1.8s)
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(40); // Should be "needs improvement" range
    });

    it('should normalize score when not all metrics available', () => {
      const partialMetrics: PerformanceMetrics = {
        lcp: 2000, // Only LCP available
      };

      const score = calculatePerformanceScore(partialMetrics);
      expect(score).toBe(100); // Good LCP = 100 when normalized
    });

    it('should cap score at 100', () => {
      // Even if somehow the math gives >100, cap it
      const metrics: PerformanceMetrics = {
        lcp: 1000,
        cls: 0.01,
        inp: 50,
        ttfb: 100,
        fcp: 500,
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should cap score at 0 (minimum)', () => {
      const metrics: PerformanceMetrics = {
        lcp: 50000,
        cls: 10.0,
        inp: 10000,
        ttfb: 50000,
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(15); // Should be very poor
    });
  });

  describe('Web Vitals Thresholds', () => {
    it('should recognize good LCP threshold (< 2.5s)', () => {
      const good: PerformanceMetrics = { lcp: 2400 };
      const needsImprovement: PerformanceMetrics = { lcp: 2600 };

      const goodScore = calculatePerformanceScore(good);
      const needsImprovementScore = calculatePerformanceScore(needsImprovement);

      expect(goodScore).toBeGreaterThanOrEqual(needsImprovementScore);
    });

    it('should recognize good CLS threshold (< 0.1)', () => {
      const good: PerformanceMetrics = { cls: 0.09 };
      const needsImprovement: PerformanceMetrics = { cls: 0.11 };

      const goodScore = calculatePerformanceScore(good);
      const needsImprovementScore = calculatePerformanceScore(needsImprovement);

      expect(goodScore).toBeGreaterThanOrEqual(needsImprovementScore);
    });

    it('should recognize good INP threshold (< 200ms)', () => {
      const good: PerformanceMetrics = { inp: 190 };
      const needsImprovement: PerformanceMetrics = { inp: 210 };

      const goodScore = calculatePerformanceScore(good);
      const needsImprovementScore = calculatePerformanceScore(needsImprovement);

      expect(goodScore).toBeGreaterThanOrEqual(needsImprovementScore);
    });

    it('should recognize good TTFB threshold (< 600ms)', () => {
      const good: PerformanceMetrics = { ttfb: 500 };
      const needsImprovement: PerformanceMetrics = { ttfb: 700 };

      const goodScore = calculatePerformanceScore(good);
      const needsImprovementScore = calculatePerformanceScore(needsImprovement);

      expect(goodScore).toBeGreaterThanOrEqual(needsImprovementScore);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should score a fast static site highly', () => {
      const fastSite: PerformanceMetrics = {
        lcp: 1200,
        cls: 0.02,
        inp: 80,
        ttfb: 200,
        fcp: 800,
      };

      const score = calculatePerformanceScore(fastSite);
      expect(score).toBeGreaterThanOrEqual(95);
    });

    it('should score a slow SPA poorly', () => {
      const slowSPA: PerformanceMetrics = {
        lcp: 4500,
        cls: 0.3,
        inp: 800,
        ttfb: 2000,
        fcp: 4000,
      };

      const score = calculatePerformanceScore(slowSPA);
      expect(score).toBeLessThanOrEqual(20);
    });

    it('should score a mobile-optimized site well', () => {
      const mobileSite: PerformanceMetrics = {
        lcp: 2200,
        cls: 0.05,
        inp: 150,
        ttfb: 500,
        imagesWithoutDimensions: 0,
      };

      const score = calculatePerformanceScore(mobileSite);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should score a heavy e-commerce site moderately', () => {
      const ecommerce: PerformanceMetrics = {
        lcp: 3200, // Product images
        cls: 0.15, // Ads and dynamic content
        inp: 280, // Heavy JavaScript
        ttfb: 800, // Server-side rendering
        renderBlockingResources: 8,
      };

      const score = calculatePerformanceScore(ecommerce);
      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThan(80);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      const metrics: PerformanceMetrics = {
        lcp: 0,
        cls: 0,
        inp: 0,
        ttfb: 0,
      };

      expect(() => calculatePerformanceScore(metrics)).not.toThrow();
      const score = calculatePerformanceScore(metrics);
      expect(score).toBe(100); // All zero = perfect
    });

    it('should handle negative values gracefully', () => {
      const metrics: PerformanceMetrics = {
        lcp: -100, // Invalid but shouldn't crash
        cls: -1,
      };

      expect(() => calculatePerformanceScore(metrics)).not.toThrow();
    });

    it('should handle extremely large values', () => {
      const metrics: PerformanceMetrics = {
        lcp: 999999,
        cls: 999,
        inp: 999999,
      };

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(50); // Very poor performance
    });

    it('should handle empty metrics object', () => {
      const metrics: PerformanceMetrics = {};

      const score = calculatePerformanceScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle only resource metrics (no core vitals)', () => {
      const metrics: PerformanceMetrics = {
        renderBlockingResources: 5,
        imagesWithoutDimensions: 3,
        fontLoadingIssues: 2,
      };

      // Should not crash, but score may be undefined/normalized
      expect(() => calculatePerformanceScore(metrics)).not.toThrow();
    });
  });
});
