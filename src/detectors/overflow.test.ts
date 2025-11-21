/**
 * Overflow Detector Tests
 */

import { describe, it, expect } from 'vitest';
import { detectOverflow } from './overflow.js';
import type { ViewportSnapshot } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';

const mockConfig: KarenConfig = {
  spacingScale: [0, 4, 8, 12, 16, 24, 32, 48, 64],
  typescale: {
    base: 16,
    ratio: 1.25,
    sizes: [12, 14, 16, 20, 25, 31, 39, 49],
  },
  colorPalette: ['#F5E6D3', '#D4A574', '#8B7355'],
  breakpoints: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'desktop', width: 1440, height: 900 },
  ],
  lineLength: { minCh: 45, maxCh: 75 },
  alignTolerancePx: 4,
  contrastRatios: { AA: 4.5, AAA: 7 },
  failOn: ['critical', 'high'],
  features: ['overflow'],
};

describe('detectOverflow', () => {
  it('should detect horizontal overflow', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 2, visibleElements: 2, overflowingElements: 1, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: 'body',
            tagName: 'BODY',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 375, height: 1000 },
            computedStyle: { overflow: 'visible' },
            children: [
              {
                selector: '.wide-element',
                tagName: 'DIV',
                classes: ['wide-element'],
                id: '',
                rect: { x: 0, y: 0, width: 500, height: 100 },
                computedStyle: { width: '500px' },
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const issues = detectOverflow(snapshots, mockConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].type).toBe('overflow');
    expect(issues[0].severity).toBe('high');
    expect(issues[0].details.overflow).toBe('horizontal');
  });

  it('should not detect overflow for properly sized elements', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 2, visibleElements: 2, overflowingElements: 0, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: 'body',
            tagName: 'BODY',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 375, height: 1000 },
            computedStyle: { overflow: 'visible' },
            children: [
              {
                selector: '.normal-element',
                tagName: 'DIV',
                classes: ['normal-element'],
                id: '',
                rect: { x: 0, y: 0, width: 300, height: 100 },
                computedStyle: { width: '300px' },
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const issues = detectOverflow(snapshots, mockConfig);

    expect(issues.length).toBe(0);
  });

  it('should detect BODY overflow', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 1, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: 'body',
            tagName: 'BODY',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 400, height: 1000 },
            computedStyle: { overflow: 'visible' },
            children: [],
          },
        ],
      },
    ];

    const issues = detectOverflow(snapshots, mockConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].element).toContain('body');
  });

  it('should provide fix suggestions with max-width', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 2, visibleElements: 2, overflowingElements: 1, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: 'body',
            tagName: 'BODY',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 375, height: 1000 },
            computedStyle: { overflow: 'visible' },
            children: [
              {
                selector: '.overflow-element',
                tagName: 'DIV',
                classes: ['overflow-element'],
                id: '',
                rect: { x: 0, y: 0, width: 500, height: 100 },
                computedStyle: { width: '500px' },
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const issues = detectOverflow(snapshots, mockConfig);

    expect(issues[0].fix).toBeDefined();
    expect(issues[0].fix?.suggestion).toContain('max-width');
    expect(issues[0].fix?.code).toBeDefined();
  });

  it('should detect overflow across multiple viewports', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'mobile', width: 375, height: 667 },
        screenshot: '',
        metrics: { totalElements: 1, visibleElements: 1, overflowingElements: 1, performanceScore: 100 },
        styles: {},
        errors: [],
        dom: [
          {
            selector: 'body',
            tagName: 'BODY',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 400, height: 1000 },
            computedStyle: { overflow: 'visible' },
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
            selector: 'body',
            tagName: 'BODY',
            classes: [],
            id: '',
            rect: { x: 0, y: 0, width: 1440, height: 1000 },
            computedStyle: { overflow: 'visible' },
            children: [],
          },
        ],
      },
    ];

    const issues = detectOverflow(snapshots, mockConfig);

    // Should only detect overflow on mobile
    expect(issues.length).toBe(1);
    expect(issues[0].viewport).toBe('mobile');
  });
});
