/**
 * Spacing Analysis
 */

import type { ViewportSnapshot, Issue } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';
import { generateId } from '../utils/id.js';

function parseSpacing(spacingValue: string): number[] {
  const values = spacingValue.split(' ').map((v) => parseFloat(v));
  return values.filter((v) => !isNaN(v));
}

function isOnScale(value: number, scale: number[]): boolean {
  return scale.some((scaleValue) => Math.abs(value - scaleValue) < 1);
}

function findNearest(value: number, scale: number[]): number {
  return scale.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

export function analyzeSpacing(
  snapshots: ViewportSnapshot[],
  config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];
  const spacingScale = config.spacingScale;

  for (const snapshot of snapshots) {
    for (const element of snapshot.dom) {
      const margins = parseSpacing(element.computedStyle.margin || '0');
      const paddings = parseSpacing(element.computedStyle.padding || '0');

      const allSpacingValues = [
        ...margins.map((v) => ({ type: 'margin', value: v })),
        ...paddings.map((v) => ({ type: 'padding', value: v })),
      ];

      for (const { type, value } of allSpacingValues) {
        if (!isOnScale(value, spacingScale) && value > 0) {
          const nearest = findNearest(value, spacingScale);

          const roastMessages = [
            `Random spacing? Really? ${value}px ${type}? Karen's judging your design tokens on ${snapshot.viewport.name}.`,
            `Using ${value}px for ${type}? Karen insists on consistency. Try ${nearest}px from your scale.`,
            `${value}px ${type}? That's not on the spacing scale, sweetie. Karen disapproves.`,
            `Arbitrary ${type} values? Karen's design system is crying on ${snapshot.viewport.name}.`,
          ];

          issues.push({
            id: generateId('SPC'),
            type: 'spacing',
            severity: 'medium',
            viewport: snapshot.viewport.name,
            element: element.selector,
            message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
            details: {
              property: type,
              value,
              nearestScaleValue: nearest,
              spacingScale,
              difference: Math.abs(value - nearest),
            },
            fix: {
              suggestion: `Use ${nearest}px from your spacing scale`,
              code: {
                file: 'styles/spacing.css',
                before: `${element.selector} {\n  ${type}: ${value}px;\n}`,
                after: `${element.selector} {\n  ${type}: ${nearest}px;\n}`,
                explanation: `Aligns to the defined spacing scale of ${spacingScale.join(', ')}px`,
              },
            },
          });
        }
      }
    }
  }

  return issues;
}
