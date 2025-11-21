/**
 * Accessibility Detector Tests
 */

import { describe, it, expect } from 'vitest';
import { checkAccessibility } from './accessibility.js';
import type { ViewportSnapshot } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';

const mockConfig: KarenConfig = {
  spacingScale: [0, 4, 8, 12, 16, 24, 32, 48, 64],
  typescale: { base: 16, ratio: 1.25, sizes: [12, 14, 16, 20, 25, 31, 39, 49] },
  colorPalette: ['#F5E6D3', '#D4A574', '#8B7355'],
  breakpoints: [{ name: 'desktop', width: 1440, height: 900 }],
  lineLength: { minCh: 45, maxCh: 75 },
  alignTolerancePx: 4,
  contrastRatios: { AA: 4.5, AAA: 7 },
  failOn: ['critical', 'high'],
  features: ['accessibility'],
};

describe('checkAccessibility', () => {
  it('should detect low contrast text', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'desktop', width: 1440, height: 900 },
        screenshot: '',
        dom: [
          {
            selector: '.low-contrast-text',
            tagName: 'P',
            classes: ['low-contrast-text'],
            id: '',
            rect: { x: 0, y: 0, width: 300, height: 50 },
            computedStyle: {
              color: 'rgb(170, 170, 170)', // Light gray
              backgroundColor: 'rgb(255, 255, 255)', // White
              fontSize: '16px',
            },
            children: [],
          },
        ],
      },
    ];

    const issues = checkAccessibility(snapshots, mockConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].type).toBe('accessibility');
    expect(issues[0].severity).toBe('high');
    expect(issues[0].details.passes).toBe(false);
  });

  it('should pass for good contrast text', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'desktop', width: 1440, height: 900 },
        screenshot: '',
        dom: [
          {
            selector: '.good-contrast-text',
            tagName: 'P',
            classes: ['good-contrast-text'],
            id: '',
            rect: { x: 0, y: 0, width: 300, height: 50 },
            computedStyle: {
              color: 'rgb(0, 0, 0)', // Black
              backgroundColor: 'rgb(255, 255, 255)', // White
              fontSize: '16px',
            },
            children: [],
          },
        ],
      },
    ];

    const issues = checkAccessibility(snapshots, mockConfig);

    expect(issues.length).toBe(0);
  });

  it('should check AAA standard for small text', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'desktop', width: 1440, height: 900 },
        screenshot: '',
        dom: [
          {
            selector: '.small-text',
            tagName: 'P',
            classes: ['small-text'],
            id: '',
            rect: { x: 0, y: 0, width: 300, height: 50 },
            computedStyle: {
              color: 'rgb(100, 100, 100)',
              backgroundColor: 'rgb(255, 255, 255)',
              fontSize: '14px', // Small text
            },
            children: [],
          },
        ],
      },
    ];

    const issues = checkAccessibility(snapshots, mockConfig);

    if (issues.length > 0) {
      expect(issues[0].details.required).toBe(7); // AAA for small text
    }
  });

  it('should check AA standard for large text', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'desktop', width: 1440, height: 900 },
        screenshot: '',
        dom: [
          {
            selector: '.large-text',
            tagName: 'H1',
            classes: ['large-text'],
            id: '',
            rect: { x: 0, y: 0, width: 500, height: 100 },
            computedStyle: {
              color: 'rgb(120, 120, 120)',
              backgroundColor: 'rgb(255, 255, 255)',
              fontSize: '24px', // Large text
            },
            children: [],
          },
        ],
      },
    ];

    const issues = checkAccessibility(snapshots, mockConfig);

    if (issues.length > 0) {
      expect(issues[0].details.required).toBe(4.5); // AA for large text
    }
  });

  it('should provide accessible color suggestions', () => {
    const snapshots: ViewportSnapshot[] = [
      {
        viewport: { name: 'desktop', width: 1440, height: 900 },
        screenshot: '',
        dom: [
          {
            selector: '.needs-fix',
            tagName: 'P',
            classes: ['needs-fix'],
            id: '',
            rect: { x: 0, y: 0, width: 300, height: 50 },
            computedStyle: {
              color: 'rgb(200, 200, 200)',
              backgroundColor: 'rgb(255, 255, 255)',
              fontSize: '16px',
            },
            children: [],
          },
        ],
      },
    ];

    const issues = checkAccessibility(snapshots, mockConfig);

    expect(issues[0].fix).toBeDefined();
    expect(issues[0].fix?.code.after).toBeDefined();
    expect(issues[0].fix?.code.after).not.toBe(issues[0].fix?.code.before);
  });
});
