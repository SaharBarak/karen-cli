import { describe, it, expect } from 'vitest';
import { analyzeSpacing } from './spacing.js';
import { defaultConfig } from '../types/config.js';
import type { ViewportSnapshot } from '../types/audit.js';

describe('analyzeSpacing', () => {
  const mockSnapshot: ViewportSnapshot = {
    viewport: { name: 'mobile', width: 375, height: 667 },
    screenshot: '',
    dom: [
      {
        selector: '.test',
        tagName: 'DIV',
        classes: ['test'],
        id: '',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        computedStyle: {
          margin: '15px', // Not on scale (should be 16px)
          padding: '8px', // On scale
        },
        children: [],
      },
    ],
    styles: {},
    metrics: {
      totalElements: 1,
      visibleElements: 1,
      overflowingElements: 0,
      performanceScore: 0,
    },
    errors: [],
  };

  it('should detect spacing values not on scale', () => {
    const issues = analyzeSpacing([mockSnapshot], defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].type).toBe('spacing');
    expect(issues[0].severity).toBe('medium');
    expect(issues[0].details.value).toBe(15);
    expect(issues[0].details.nearestScaleValue).toBe(16);
  });

  it('should not flag spacing values on scale', () => {
    const onScaleSnapshot: ViewportSnapshot = {
      ...mockSnapshot,
      dom: [
        {
          ...mockSnapshot.dom[0],
          computedStyle: {
            margin: '16px', // On scale
            padding: '8px', // On scale
          },
        },
      ],
    };

    const issues = analyzeSpacing([onScaleSnapshot], defaultConfig);

    expect(issues.length).toBe(0);
  });

  it('should handle multiple spacing values', () => {
    const multiSnapshot: ViewportSnapshot = {
      ...mockSnapshot,
      dom: [
        {
          ...mockSnapshot.dom[0],
          computedStyle: {
            margin: '10px 15px 20px 25px', // Mix of on/off scale
            padding: '0px',
          },
        },
      ],
    };

    const issues = analyzeSpacing([multiSnapshot], defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
  });
});
