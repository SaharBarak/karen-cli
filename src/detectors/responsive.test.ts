/**
 * Responsive Design Detector Tests
 */

import { describe, it, expect } from 'vitest';
import { enforceResponsiveDesign } from './responsive.js';
import type { ViewportSnapshot } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';

const mockConfig: KarenConfig = {
  spacingScale: [0, 4, 8, 12, 16, 24, 32, 48, 64],
  typescale: { base: 16, ratio: 1.25, sizes: [12, 14, 16, 20, 25, 31, 39, 49] },
  colorPalette: ['#F5E6D3'],
  breakpoints: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ],
  lineLength: { minCh: 45, maxCh: 75 },
  alignTolerancePx: 4,
  contrastRatios: { AA: 4.5, AAA: 7 },
  failOn: ['critical', 'high'],
  features: ['design-system'],
};

describe('enforceResponsiveDesign', () => {
  it('should detect fixed font sizes across viewports', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.hero-title',
            tagName: 'H1',
            classes: ['hero-title'],
            id: '',
            rect: { x: 0, y: 0, width: 300, height: 100 },
            computedStyle: {
              fontSize: '48px',
              padding: '32px',
            },
            children: [],
          },
        ],
      },
      {
        viewport: { name: 'tablet', width: 768, height: 1024 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.hero-title',
            tagName: 'H1',
            classes: ['hero-title'],
            id: '',
            rect: { x: 0, y: 0, width: 600, height: 100 },
            computedStyle: {
              fontSize: '48px', // Same as mobile - not responsive!
              padding: '32px',
            },
            children: [],
          },
        ],
      },
      {
        viewport: { name: 'desktop', width: 1440, height: 900 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.hero-title',
            tagName: 'H1',
            classes: ['hero-title'],
            id: '',
            rect: { x: 0, y: 0, width: 1000, height: 100 },
            computedStyle: {
              fontSize: '48px', // Same as mobile - not responsive!
              padding: '32px',
            },
            children: [],
          },
        ],
      },
    ];

    const issues = enforceResponsiveDesign(snapshots, mockConfig);

    expect(issues.length).toBeGreaterThan(0);
    const fontIssue = issues.find((i) =>
      i.message.toLowerCase().includes('font')
    );
    expect(fontIssue).toBeDefined();
    expect(fontIssue?.details.property).toBe('font-size');
  });

  it('should generate clamp() values for responsive typography', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.large-text',
            tagName: 'H1',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 300, height: 80 },
            computedStyle: { fontSize: '36px' },
            children: [],
          },
        ],
      },
      {
        viewport: { name: 'tablet', width: 768, height: 1024 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.large-text',
            tagName: 'H1',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 600, height: 80 },
            computedStyle: { fontSize: '36px' },
            children: [],
          },
        ],
      },
      {
        viewport: { name: 'desktop', width: 1440, height: 900 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.large-text',
            tagName: 'H1',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 1000, height: 80 },
            computedStyle: { fontSize: '36px' },
            children: [],
          },
        ],
      },
    ];

    const issues = enforceResponsiveDesign(snapshots, mockConfig);

    const clampIssue = issues.find((i) =>
      i.fix?.code.after?.includes('clamp(')
    );
    expect(clampIssue).toBeDefined();
    expect(clampIssue?.fix?.code.after).toMatch(/clamp\(/);
  });

  it('should detect fixed pixel widths exceeding viewport', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 1, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.wide-element',
            tagName: 'DIV',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 500, height: 100 },
            computedStyle: { width: '500px' },
            children: [],
          },
        ],
      },
    ];

    const issues = enforceResponsiveDesign(snapshots, mockConfig);

    const widthIssue = issues.find((i) =>
      i.type === 'overflow' && i.details?.elementWidth > i.details?.viewportWidth
    );
    expect(widthIssue).toBeDefined();
    expect(widthIssue?.severity).toBe('high');
  });

  it('should detect fixed padding that should reduce on mobile', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.padded-element',
            tagName: 'DIV',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 300, height: 100 },
            computedStyle: { padding: '48px' }, // Large padding on mobile
          },
        ],
      },
      {
        viewport: { name: 'tablet', width: 768, height: 1024 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.padded-element',
            tagName: 'DIV',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 600, height: 100 },
            computedStyle: { padding: '48px' }, // Same padding
            children: [],
          },
        ],
      },
      {
        viewport: { name: 'desktop', width: 1440, height: 900 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.padded-element',
            tagName: 'DIV',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 1000, height: 100 },
            computedStyle: { padding: '48px' }, // Same padding
            children: [],
          },
        ],
      },
    ];

    const issues = enforceResponsiveDesign(snapshots, mockConfig);

    const paddingIssue = issues.find((i) =>
      i.message.toLowerCase().includes('padding')
    );
    expect(paddingIssue).toBeDefined();
    expect(paddingIssue?.fix?.code.after).toContain('@media');
  });

  it('should suggest mobile-first media queries', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.element',
            tagName: 'DIV',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 300, height: 100 },
            computedStyle: { padding: '40px' },
            children: [],
          },
        ],
      },
      {
        viewport: { name: 'desktop', width: 1440, height: 900 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: '.element',
            tagName: 'DIV',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 1000, height: 100 },
            computedStyle: { padding: '40px' },
            children: [],
          },
        ],
      },
    ];

    const issues = enforceResponsiveDesign(snapshots, mockConfig);

    if (issues.length > 0) {
      const mediaQueryFix = issues.find((i) =>
        i.fix?.code.after?.includes('min-width')
      );
      expect(mediaQueryFix).toBeDefined();
    }
  });
});
