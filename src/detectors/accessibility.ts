/**
 * Accessibility & Contrast Checking
 */

import type { ViewportSnapshot, Issue } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';
import { generateId } from '../utils/id.js';

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseColor(colorStr: string): RGB | null {
  // Simple RGB parser (can be extended for hex, hsl, etc.)
  const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  // Hex color parser
  const hexMatch = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    };
  }

  return null;
}

function getLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrast(fg: RGB, bg: RGB): number {
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function generateAccessibleColor(bg: RGB, _requiredRatio: number): string {
  // Simple approach: make text darker or lighter
  const bgLum = getLuminance(bg);
  if (bgLum > 0.5) {
    // Light background, use dark text
    return '#000000';
  } else {
    // Dark background, use light text
    return '#FFFFFF';
  }
}

export function checkAccessibility(
  snapshots: ViewportSnapshot[],
  config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];

  for (const snapshot of snapshots) {
    const textElements = snapshot.dom.filter(
      (el) => el.computedStyle.fontSize && parseFloat(el.computedStyle.fontSize) > 0
    );

    for (const element of textElements) {
      const fgColor = parseColor(element.computedStyle.color || '#000000');
      const bgColor = parseColor(element.computedStyle.backgroundColor || '#ffffff');

      if (!fgColor || !bgColor) continue;

      const contrastRatio = calculateContrast(fgColor, bgColor);
      const fontSize = parseFloat(element.computedStyle.fontSize || '16');

      const requiredRatio =
        fontSize < 18 ? config.contrastRatios.AAA : config.contrastRatios.AA;

      if (contrastRatio < requiredRatio) {
        const roastMessages = [
          `Contrast ratio? Never heard of her. Gray text on gray background? Karen's calling WCAG on you at ${snapshot.viewport.name}.`,
          `${contrastRatio.toFixed(2)}:1 contrast ratio? WCAG requires ${requiredRatio}:1. Karen's disappointed on ${snapshot.viewport.name}.`,
          `Low contrast text detected on ${snapshot.viewport.name}. Karen insists on accessibility, sweetie.`,
          `Text you can barely see? Karen's not here for it. Fix your contrast on ${snapshot.viewport.name}.`,
        ];

        issues.push({
          id: generateId('A11Y'),
          type: 'accessibility',
          severity: 'high',
          viewport: snapshot.viewport.name,
          element: element.selector,
          message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
          details: {
            foreground: element.computedStyle.color,
            background: element.computedStyle.backgroundColor,
            contrastRatio: parseFloat(contrastRatio.toFixed(2)),
            required: requiredRatio,
            passes: false,
            wcagLevel: requiredRatio >= 7 ? 'AAA' : 'AA',
          },
          screenshot: snapshot.screenshot,
          fix: {
            suggestion: `Increase contrast to meet WCAG ${requiredRatio >= 7 ? 'AAA' : 'AA'} standards`,
            code: {
              file: 'styles/colors.css',
              before: `${element.selector} {\n  color: ${element.computedStyle.color};\n}`,
              after: `${element.selector} {\n  color: ${generateAccessibleColor(bgColor, requiredRatio)};\n}`,
              explanation: `Ensures ${requiredRatio}:1 contrast ratio for WCAG compliance`,
            },
          },
        });
      }
    }
  }

  return issues;
}
