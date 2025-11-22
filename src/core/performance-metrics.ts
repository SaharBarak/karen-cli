/**
 * Performance Metrics Collection
 * Collects Core Web Vitals using Playwright and web-vitals library
 */

import type { Page } from 'playwright';
import type { PerformanceMetrics } from '../detectors/performance.js';

export interface WebVitalsMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

/**
 * Collect Core Web Vitals from a page using web-vitals library
 */
export async function collectWebVitals(page: Page): Promise<PerformanceMetrics> {
  // Inject web-vitals library into the page
  await page.addScriptTag({
    url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js',
  });

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Collect metrics using web-vitals library
  const metrics = await page.evaluate(() => {
    return new Promise<Record<string, number>>((resolve) => {
      const collected: Record<string, number> = {};
      let metricsReceived = 0;
      const expectedMetrics = 5; // LCP, CLS, FID/INP, FCP, TTFB

      const onMetric = (metric: any) => {
        collected[metric.name] = metric.value;
        metricsReceived++;

        // Resolve when we have all metrics (or timeout)
        if (metricsReceived >= expectedMetrics) {
          resolve(collected);
        }
      };

      // Use web-vitals library (injected via IIFE)
      const webVitals = (window as any).webVitals;

      if (webVitals) {
        webVitals.onLCP(onMetric);
        webVitals.onCLS(onMetric);
        webVitals.onFID(onMetric); // Falls back to INP if FID not available
        webVitals.onINP?.(onMetric); // INP is newer
        webVitals.onFCP(onMetric);
        webVitals.onTTFB(onMetric);
      }

      // Timeout after 10 seconds
      setTimeout(() => resolve(collected), 10000);
    });
  });

  // Get additional performance metrics from Navigation Timing API
  const navigationMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    return {
      ttfb: navigation?.responseStart - navigation?.requestStart || 0,
      fcp: paint.find((p) => p.name === 'first-contentful-paint')?.startTime || 0,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
    };
  });

  // Analyze images for dimensions
  const imageAnalysis = await analyzeImages(page);

  // Analyze render-blocking resources
  const resourceAnalysis = await analyzeResources(page);

  // Analyze font loading
  const fontAnalysis = await analyzeFonts(page);

  return {
    lcp: metrics.LCP || undefined,
    cls: metrics.CLS || undefined,
    fid: metrics.FID || undefined,
    inp: metrics.INP || undefined,
    ttfb: metrics.TTFB || navigationMetrics.ttfb || undefined,
    fcp: metrics.FCP || navigationMetrics.fcp || undefined,
    tti: undefined, // Would need Lighthouse for accurate TTI
    tbt: undefined, // Would need Lighthouse for accurate TBT
    renderBlockingResources: resourceAnalysis.renderBlocking,
    imagesWithoutDimensions: imageAnalysis.withoutDimensions,
    unoptimizedImages: imageAnalysis.unoptimized,
    fontLoadingIssues: fontAnalysis.issues,
  };
}

/**
 * Analyze images for missing dimensions
 */
async function analyzeImages(page: Page): Promise<{
  withoutDimensions: number;
  unoptimized: number;
}> {
  return page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    let withoutDimensions = 0;
    let unoptimized = 0;

    for (const img of images) {
      // Check if image has width/height attributes or CSS dimensions
      const hasWidth = img.hasAttribute('width') || img.style.width;
      const hasHeight = img.hasAttribute('height') || img.style.height;
      const hasAspectRatio = window.getComputedStyle(img).aspectRatio !== 'auto';

      if (!hasWidth && !hasHeight && !hasAspectRatio) {
        withoutDimensions++;
      }

      // Check if image is unoptimized (> 100KB without srcset)
      if (img.currentSrc && !img.srcset) {
        // Would need to actually fetch image size, approximating for now
        const naturalArea = img.naturalWidth * img.naturalHeight;
        if (naturalArea > 1000000) {
          // ~1MP
          unoptimized++;
        }
      }
    }

    return { withoutDimensions, unoptimized };
  });
}

/**
 * Analyze resources for render-blocking
 */
async function analyzeResources(page: Page): Promise<{
  renderBlocking: number;
}> {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    let renderBlocking = 0;

    for (const resource of resources) {
      // Check for render-blocking stylesheets and scripts
      if (resource.initiatorType === 'link' || resource.initiatorType === 'script') {
        // Resources loaded before FCP are potentially render-blocking
        const paint = performance.getEntriesByType('paint');
        const fcp = paint.find((p) => p.name === 'first-contentful-paint')?.startTime || 0;

        if (resource.startTime < fcp) {
          renderBlocking++;
        }
      }
    }

    // Also check for synchronous scripts in head
    const scriptsInHead = document.head.querySelectorAll('script:not([async]):not([defer])');
    renderBlocking += scriptsInHead.length;

    // Check for stylesheets without media query or preload
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]:not([media])');
    renderBlocking += stylesheets.length;

    return { renderBlocking };
  });
}

/**
 * Analyze font loading for FOIT/FOUT issues
 */
async function analyzeFonts(page: Page): Promise<{
  issues: number;
}> {
  return page.evaluate(() => {
    let issues = 0;

    // Check if fonts are using font-display
    const stylesheets = Array.from(document.styleSheets);

    for (const stylesheet of stylesheets) {
      try {
        const rules = Array.from(stylesheet.cssRules || []);

        for (const rule of rules) {
          if (rule instanceof CSSFontFaceRule) {
            const fontDisplay = rule.style.getPropertyValue('font-display');

            // If font-display is not set or is 'auto', it may cause FOIT
            if (!fontDisplay || fontDisplay === 'auto') {
              issues++;
            }
          }
        }
      } catch (e) {
        // Cross-origin stylesheet, can't access
      }
    }

    // Check for font resources without preload
    const fontResources = performance
      .getEntriesByType('resource')
      .filter((r: any) => r.initiatorType === 'css' && /\.(woff2?|ttf|otf|eot)$/i.test(r.name));

    const preloadedFonts = document.querySelectorAll('link[rel="preload"][as="font"]');

    // If there are fonts but no preloads, count as issues
    if (fontResources.length > 0 && preloadedFonts.length === 0) {
      issues += fontResources.length;
    }

    return { issues };
  });
}

/**
 * Calculate performance score (0-100) based on Core Web Vitals
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  let score = 100;
  let weights = 0;

  // LCP scoring (weight: 25)
  if (metrics.lcp !== undefined) {
    weights += 25;
    if (metrics.lcp > 4000) score -= 25; // Poor
    else if (metrics.lcp > 2500) score -= 15; // Needs improvement
    else score -= 0; // Good
  }

  // CLS scoring (weight: 25)
  if (metrics.cls !== undefined) {
    weights += 25;
    if (metrics.cls > 0.25) score -= 25; // Poor
    else if (metrics.cls > 0.1) score -= 15; // Needs improvement
    else score -= 0; // Good
  }

  // INP/FID scoring (weight: 25)
  const interactionMetric = metrics.inp || metrics.fid;
  if (interactionMetric !== undefined) {
    weights += 25;
    if (interactionMetric > 500) score -= 25; // Poor
    else if (interactionMetric > 200) score -= 15; // Needs improvement
    else score -= 0; // Good
  }

  // TTFB scoring (weight: 15)
  if (metrics.ttfb !== undefined) {
    weights += 15;
    if (metrics.ttfb > 1800) score -= 15; // Poor
    else if (metrics.ttfb > 600) score -= 8; // Needs improvement
    else score -= 0; // Good
  }

  // FCP scoring (weight: 10)
  if (metrics.fcp !== undefined) {
    weights += 10;
    if (metrics.fcp > 3000) score -= 10; // Poor
    else if (metrics.fcp > 1800) score -= 5; // Needs improvement
    else score -= 0; // Good
  }

  // Normalize score if not all metrics available
  if (weights < 100) {
    score = Math.round((score / weights) * 100);
  }

  return Math.max(0, Math.min(100, score));
}
