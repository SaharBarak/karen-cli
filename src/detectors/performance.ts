/**
 * Performance Detection (Core Web Vitals)
 *
 * Detects:
 * - LCP (Largest Contentful Paint) > 2.5s
 * - CLS (Cumulative Layout Shift) > 0.1
 * - FID/INP (First Input Delay / Interaction to Next Paint)
 * - TTFB (Time to First Byte) > 600ms
 * - Images without dimensions (causes CLS)
 * - Render-blocking resources
 * - Font loading issues (FOIT/FOUT)
 */

import type { ViewportSnapshot, Issue } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';
import { generateId } from '../utils/id.js';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint (ms)
  cls?: number; // Cumulative Layout Shift (score)
  fid?: number; // First Input Delay (ms)
  inp?: number; // Interaction to Next Paint (ms)
  ttfb?: number; // Time to First Byte (ms)

  // Additional metrics
  fcp?: number; // First Contentful Paint (ms)
  tti?: number; // Time to Interactive (ms)
  tbt?: number; // Total Blocking Time (ms)

  // Resource metrics
  renderBlockingResources?: number;
  imagesWithoutDimensions?: number;
  unoptimizedImages?: number;
  fontLoadingIssues?: number;
}

export function detectPerformance(
  snapshots: ViewportSnapshot[],
  _config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];

  for (const snapshot of snapshots) {
    // Extract performance metrics from snapshot
    const metrics = extractPerformanceMetrics(snapshot);

    // Check LCP (Largest Contentful Paint)
    if (metrics.lcp && metrics.lcp > 2500) {
      const severity = metrics.lcp > 4000 ? 'critical' : metrics.lcp > 2500 ? 'high' : 'medium';

      const roastMessages = [
        `LCP of ${(metrics.lcp / 1000).toFixed(2)}s? Karen's grandmother loads faster than this.`,
        `Your site takes ${(metrics.lcp / 1000).toFixed(2)} seconds to show content. Users are already gone, sweetie.`,
        `${(metrics.lcp / 1000).toFixed(2)}s for LCP? That's embarrassing even by 2010 standards.`,
        `Largest Contentful Paint is ${(metrics.lcp / 1000).toFixed(2)}s. Karen hopes you enjoy your 95% bounce rate.`,
      ];

      issues.push({
        id: generateId('PERF'),
        type: 'performance',
        severity,
        viewport: snapshot.viewport.name,
        element: 'LCP Element',
        message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
        details: {
          metric: 'LCP',
          value: metrics.lcp,
          threshold: 2500,
          unit: 'ms',
          viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`,
        },
        screenshot: snapshot.screenshot,
        fix: {
          suggestion: 'Optimize LCP by preloading critical images, optimizing server response time, and removing render-blocking resources',
          code: {
            file: 'index.html',
            before: `<img src="/hero.jpg" alt="Hero">`,
            after: `<!-- Preload LCP image -->\n<link rel="preload" as="image" href="/hero.jpg">\n\n<!-- Use optimized image with proper dimensions -->\n<img src="/hero.jpg" alt="Hero" width="1200" height="600" loading="eager">`,
            explanation: 'Preload critical images and specify dimensions to improve LCP',
          },
        },
      });
    }

    // Check CLS (Cumulative Layout Shift)
    if (metrics.cls && metrics.cls > 0.1) {
      const severity = metrics.cls > 0.25 ? 'critical' : metrics.cls > 0.1 ? 'high' : 'medium';

      const roastMessages = [
        `CLS of ${metrics.cls.toFixed(3)}? Your layout shifts more than a dance floor, sweetie.`,
        `Cumulative Layout Shift is ${metrics.cls.toFixed(3)}. Karen bets your users are clicking the wrong buttons constantly.`,
        `${metrics.cls.toFixed(3)} layout shift score. Did you even specify image dimensions?`,
        `Your CLS is ${metrics.cls.toFixed(3)}. It's like watching a bouncy castle made of HTML.`,
      ];

      issues.push({
        id: generateId('PERF'),
        type: 'performance',
        severity,
        viewport: snapshot.viewport.name,
        element: 'Layout Shift',
        message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
        details: {
          metric: 'CLS',
          value: metrics.cls,
          threshold: 0.1,
          unit: 'score',
          viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`,
        },
        screenshot: snapshot.screenshot,
        fix: {
          suggestion: 'Reserve space for images and ads, avoid injecting content above existing content',
          code: {
            file: 'styles/layout.css',
            before: `img {\n  /* no dimensions */\n}`,
            after: `img {\n  /* Reserve space to prevent layout shift */\n  aspect-ratio: attr(width) / attr(height);\n  width: 100%;\n  height: auto;\n}\n\n/* Or use explicit dimensions */\n.hero-img {\n  width: 100%;\n  height: auto;\n  min-height: 400px;\n}`,
            explanation: 'Specifying dimensions prevents layout shifts as images load',
          },
        },
      });
    }

    // Check INP/FID (Interaction responsiveness)
    if (metrics.inp && metrics.inp > 200) {
      const severity = metrics.inp > 500 ? 'critical' : metrics.inp > 200 ? 'high' : 'medium';

      const roastMessages = [
        `INP of ${metrics.inp}ms? Karen clicked a button last year and it still hasn't responded.`,
        `${metrics.inp}ms to respond to input. Your users are rage-clicking, sweetie.`,
        `Interaction lag of ${metrics.inp}ms. Is this a website or a slideshow?`,
        `${metrics.inp}ms INP. Karen's seen glaciers move faster than your event handlers.`,
      ];

      issues.push({
        id: generateId('PERF'),
        type: 'performance',
        severity,
        viewport: snapshot.viewport.name,
        element: 'Interaction Handler',
        message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
        details: {
          metric: 'INP',
          value: metrics.inp,
          threshold: 200,
          unit: 'ms',
          viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`,
        },
        screenshot: snapshot.screenshot,
        fix: {
          suggestion: 'Use web workers for heavy computations, debounce/throttle event handlers, code-split large JavaScript bundles',
          code: {
            file: 'components/Button.tsx',
            before: `button.addEventListener('click', (e) => {\n  // Heavy synchronous work\n  processData();\n});`,
            after: `button.addEventListener('click', async (e) => {\n  // Defer heavy work to not block main thread\n  requestIdleCallback(() => {\n    processData();\n  });\n  \n  // Or use web worker\n  const worker = new Worker('/workers/process.js');\n  worker.postMessage(data);\n});`,
            explanation: 'Move heavy work off the main thread to improve interaction responsiveness',
          },
        },
      });
    }

    // Check TTFB (Time to First Byte)
    if (metrics.ttfb && metrics.ttfb > 600) {
      const severity = metrics.ttfb > 1800 ? 'critical' : metrics.ttfb > 600 ? 'high' : 'medium';

      const roastMessages = [
        `TTFB of ${metrics.ttfb}ms? Your server is taking a nap, sweetie.`,
        `${metrics.ttfb}ms to first byte. Karen could've baked a cake in that time.`,
        `Time to First Byte is ${metrics.ttfb}ms. Is your server hosted on a Raspberry Pi?`,
        `${metrics.ttfb}ms TTFB. Your CDN called, they want their money back.`,
      ];

      issues.push({
        id: generateId('PERF'),
        type: 'performance',
        severity,
        viewport: snapshot.viewport.name,
        element: 'Server Response',
        message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
        details: {
          metric: 'TTFB',
          value: metrics.ttfb,
          threshold: 600,
          unit: 'ms',
          viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`,
        },
        screenshot: snapshot.screenshot,
        fix: {
          suggestion: 'Use a CDN, enable caching, optimize database queries, use edge functions',
          code: {
            file: 'next.config.js',
            before: `module.exports = {\n  // no caching\n}`,
            after: `module.exports = {\n  // Enable static generation and edge caching\n  output: 'standalone',\n  images: {\n    domains: ['cdn.example.com'],\n  },\n  \n  // Cache API responses\n  async headers() {\n    return [\n      {\n        source: '/api/:path*',\n        headers: [\n          {\n            key: 'Cache-Control',\n            value: 's-maxage=3600, stale-while-revalidate',\n          },\n        ],\n      },\n    ];\n  },\n}`,
            explanation: 'Enable caching and use CDN to reduce server response time',
          },
        },
      });
    }

    // Check for images without dimensions (causes CLS)
    if (metrics.imagesWithoutDimensions && metrics.imagesWithoutDimensions > 0) {
      const roastMessages = [
        `${metrics.imagesWithoutDimensions} images without dimensions? Karen's shocked you even tested this.`,
        `Found ${metrics.imagesWithoutDimensions} images causing layout shift. Width and height attributes exist, sweetie.`,
        `${metrics.imagesWithoutDimensions} unsized images. Your CLS score called, it's crying.`,
        `Images without dimensions? That's Web Development 101, honey.`,
      ];

      issues.push({
        id: generateId('PERF'),
        type: 'performance',
        severity: 'high',
        viewport: snapshot.viewport.name,
        element: `${metrics.imagesWithoutDimensions} images`,
        message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
        details: {
          issue: 'images-without-dimensions',
          count: metrics.imagesWithoutDimensions,
          impact: 'Causes layout shift (CLS)',
          viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`,
        },
        screenshot: snapshot.screenshot,
        fix: {
          suggestion: 'Always specify width and height attributes on images',
          code: {
            file: 'components/Image.tsx',
            before: `<img src="/photo.jpg" alt="Photo">`,
            after: `<img \n  src="/photo.jpg" \n  alt="Photo"\n  width="800"\n  height="600"\n  loading="lazy"\n/>`,
            explanation: 'Browsers can reserve space before the image loads, preventing layout shift',
          },
        },
      });
    }

    // Check for render-blocking resources
    if (metrics.renderBlockingResources && metrics.renderBlockingResources > 0) {
      const roastMessages = [
        `${metrics.renderBlockingResources} render-blocking resources? Karen's users see a white screen for days.`,
        `Found ${metrics.renderBlockingResources} render-blockers. Ever heard of async/defer, sweetie?`,
        `${metrics.renderBlockingResources} resources blocking render. Your FCP is crying.`,
        `Render-blocking scripts? It's 2025, honey. Learn to defer.`,
      ];

      issues.push({
        id: generateId('PERF'),
        type: 'performance',
        severity: 'high',
        viewport: snapshot.viewport.name,
        element: 'Critical rendering path',
        message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
        details: {
          issue: 'render-blocking-resources',
          count: metrics.renderBlockingResources,
          impact: 'Delays First Contentful Paint',
          viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`,
        },
        screenshot: snapshot.screenshot,
        fix: {
          suggestion: 'Use async/defer for scripts, inline critical CSS, lazy-load non-critical resources',
          code: {
            file: 'index.html',
            before: `<script src="/analytics.js"></script>\n<link rel="stylesheet" href="/styles.css">`,
            after: `<!-- Defer non-critical scripts -->\n<script src="/analytics.js" defer></script>\n\n<!-- Inline critical CSS, load rest async -->\n<style>/* Critical CSS inline */</style>\n<link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">\n<noscript><link rel="stylesheet" href="/styles.css"></noscript>`,
            explanation: 'Non-critical resources should not block initial render',
          },
        },
      });
    }

    // Check for font loading issues
    if (metrics.fontLoadingIssues && metrics.fontLoadingIssues > 0) {
      const roastMessages = [
        `Font loading issues detected. FOIT and FOUT called, they're embarrassed for you.`,
        `Your fonts are flash-loading like it's a disco. Ever heard of font-display, sweetie?`,
        `Font render issues causing text flicker. Karen's users need sunglasses.`,
        `Unstyled text flash? Preload your fonts, honey.`,
      ];

      issues.push({
        id: generateId('PERF'),
        type: 'performance',
        severity: 'medium',
        viewport: snapshot.viewport.name,
        element: 'Web fonts',
        message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
        details: {
          issue: 'font-loading',
          count: metrics.fontLoadingIssues,
          impact: 'Causes FOIT/FOUT (flash of invisible/unstyled text)',
          viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`,
        },
        screenshot: snapshot.screenshot,
        fix: {
          suggestion: 'Use font-display: swap, preload critical fonts, use system font stack as fallback',
          code: {
            file: 'styles/fonts.css',
            before: `@font-face {\n  font-family: 'CustomFont';\n  src: url('/fonts/custom.woff2');\n}`,
            after: `@font-face {\n  font-family: 'CustomFont';\n  src: url('/fonts/custom.woff2');\n  /* Show fallback immediately, swap when loaded */\n  font-display: swap;\n}\n\n/* Preload in HTML */\n<!-- <link rel="preload" href="/fonts/custom.woff2" as="font" type="font/woff2" crossorigin> -->`,
            explanation: 'font-display: swap prevents invisible text and improves perceived performance',
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Extract performance metrics from viewport snapshot
 * This would be populated by Playwright performance APIs during screenshot capture
 */
function extractPerformanceMetrics(snapshot: ViewportSnapshot): PerformanceMetrics {
  // In real implementation, these would come from:
  // 1. page.evaluate(() => performance.getEntriesByType('navigation'))
  // 2. page.evaluate(() => performance.getEntriesByType('paint'))
  // 3. Web Vitals library
  // 4. Lighthouse APIs

  // For now, extract from snapshot.metrics if available
  const metrics: PerformanceMetrics = {};

  if (snapshot.metrics && typeof snapshot.metrics === 'object') {
    const perf = snapshot.metrics as any;

    metrics.lcp = perf.lcp;
    metrics.cls = perf.cls;
    metrics.fid = perf.fid;
    metrics.inp = perf.inp;
    metrics.ttfb = perf.ttfb;
    metrics.fcp = perf.fcp;
    metrics.tti = perf.tti;
    metrics.tbt = perf.tbt;
    metrics.renderBlockingResources = perf.renderBlockingResources;
    metrics.imagesWithoutDimensions = perf.imagesWithoutDimensions;
    metrics.unoptimizedImages = perf.unoptimizedImages;
    metrics.fontLoadingIssues = perf.fontLoadingIssues;
  }

  return metrics;
}
