/**
 * Design Token Enforcement Detector
 * Detects hardcoded values that should use CSS variables/design tokens
 */

import type { ViewportSnapshot, Issue } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';
import { generateId } from '../utils/id.js';

/**
 * Main design token enforcement function
 */
export function enforceDesignTokens(
  snapshots: ViewportSnapshot[],
  config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];

  // Track which elements have been checked to avoid duplicates
  const checkedElements = new Set<string>();

  for (const snapshot of snapshots) {
    for (const element of snapshot.dom) {
      const elementKey = `${element.selector}-${snapshot.viewport.name}`;
      if (checkedElements.has(elementKey)) continue;
      checkedElements.add(elementKey);

      // Check spacing (padding, margin)
      issues.push(...checkSpacingTokens(element, snapshot, config));

      // Check colors
      issues.push(...checkColorTokens(element, snapshot, config));

      // Check border-radius
      issues.push(...checkBorderRadiusTokens(element, snapshot));

      // Check font sizes
      issues.push(...checkTypographyTokens(element, snapshot, config));
    }
  }

  return issues;
}

/**
 * Check if spacing values should use design tokens
 */
function checkSpacingTokens(
  element: any,
  snapshot: ViewportSnapshot,
  config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];

  // Check padding
  const padding = element.computedStyle.padding;
  if (padding && !padding.includes('var(') && padding !== '0px') {
    const paddingValues = padding.split(' ').map((v: string) => parseInt(v));
    const allOnScale = paddingValues.every((val: number) =>
      config.spacingScale.includes(val)
    );

    if (allOnScale && paddingValues.some((v: number) => v > 0)) {
      const tokenNames = paddingValues.map((val: number) => {
        const index = config.spacingScale.indexOf(val);
        return `var(--spacing-${index})`;
      });

      issues.push({
        id: generateId('DT'),
        type: 'design-system',
        severity: 'low',
        viewport: snapshot.viewport.name,
        element: element.selector,
        message: `Hardcoded padding? Karen insists on design tokens for consistency.`,
        details: {
          property: 'padding',
          currentValue: padding,
          spacingScale: config.spacingScale,
          shouldUseTokens: true,
        },
        fix: {
          suggestion: 'Replace hardcoded padding with CSS variables from spacing scale',
          code: {
            file: 'styles/spacing.css',
            before: `${element.selector} {\n  padding: ${padding};\n}`,
            after: `${element.selector} {\n  padding: ${tokenNames.join(' ')};\n}`,
            explanation: 'Using design tokens ensures consistency across your design system',
          },
        },
      });
    }
  }

  // Check margin
  const margin = element.computedStyle.margin;
  if (margin && !margin.includes('var(') && margin !== '0px' && margin !== 'auto') {
    const marginValues = margin.split(' ').map((v: string) => {
      if (v === 'auto') return 0;
      return parseInt(v);
    });
    const allOnScale = marginValues.every((val: number) =>
      val === 0 || config.spacingScale.includes(val)
    );

    if (allOnScale && marginValues.some((v: number) => v > 0)) {
      const tokenNames = marginValues.map((val: number) => {
        if (val === 0) return '0';
        const index = config.spacingScale.indexOf(val);
        return `var(--spacing-${index})`;
      });

      issues.push({
        id: generateId('DT'),
        type: 'design-system',
        severity: 'low',
        viewport: snapshot.viewport.name,
        element: element.selector,
        message: `Hardcoded margin values? Use tokens like a professional, sweetie.`,
        details: {
          property: 'margin',
          currentValue: margin,
          spacingScale: config.spacingScale,
          shouldUseTokens: true,
        },
        fix: {
          suggestion: 'Replace hardcoded margin with CSS variables from spacing scale',
          code: {
            file: 'styles/spacing.css',
            before: `${element.selector} {\n  margin: ${margin};\n}`,
            after: `${element.selector} {\n  margin: ${tokenNames.join(' ')};\n}`,
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Check if colors should use design tokens
 */
function checkColorTokens(
  element: any,
  snapshot: ViewportSnapshot,
  config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];

  const bgColor = element.computedStyle.backgroundColor;
  if (bgColor && !bgColor.includes('var(') && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
    const normalized = normalizeColor(bgColor);
    if (!normalized) return issues;

    // Check if color is in palette
    const inPalette = config.colorPalette.some((paletteColor) => {
      const distance = colorDistance(normalized, paletteColor.toUpperCase());
      return distance < 10;
    });

    if (inPalette) {
      issues.push({
        id: generateId('DT'),
        type: 'design-system',
        severity: 'low',
        viewport: snapshot.viewport.name,
        element: element.selector,
        message: `Hardcoded background color? Karen demands you use your palette tokens.`,
        details: {
          property: 'backgroundColor',
          currentColor: bgColor,
          palette: config.colorPalette,
          shouldUseToken: true,
        },
        fix: {
          suggestion: 'Use CSS variable from your color palette',
          code: {
            file: 'styles/colors.css',
            before: `${element.selector} {\n  background-color: ${bgColor};\n}`,
            after: `${element.selector} {\n  background-color: var(--color-primary);\n}`,
            explanation: 'Replace with appropriate color token from your palette',
          },
        },
      });
    }
  }

  // Check text color
  const textColor = element.computedStyle.color;
  if (textColor && !textColor.includes('var(') && textColor !== 'transparent') {
    const normalized = normalizeColor(textColor);
    if (!normalized) return issues;

    const inPalette = config.colorPalette.some((paletteColor) => {
      const distance = colorDistance(normalized, paletteColor.toUpperCase());
      return distance < 10;
    });

    if (inPalette) {
      issues.push({
        id: generateId('DT'),
        type: 'design-system',
        severity: 'low',
        viewport: snapshot.viewport.name,
        element: element.selector,
        message: `Hardcoded text color? Design tokens exist for a reason.`,
        details: {
          property: 'color',
          currentColor: textColor,
          palette: config.colorPalette,
          shouldUseToken: true,
        },
        fix: {
          suggestion: 'Use CSS variable from your color palette',
          code: {
            file: 'styles/colors.css',
            before: `${element.selector} {\n  color: ${textColor};\n}`,
            after: `${element.selector} {\n  color: var(--color-text);\n}`,
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Check if border-radius should use tokens
 */
function checkBorderRadiusTokens(element: any, snapshot: ViewportSnapshot): Issue[] {
  const issues: Issue[] = [];

  const borderRadius = element.computedStyle.borderRadius;
  if (borderRadius && !borderRadius.includes('var(') && borderRadius !== '0px') {
    const radiusValue = parseInt(borderRadius);
    const standardRadii = [4, 8, 12, 16, 24];

    if (standardRadii.includes(radiusValue)) {
      const tokenNames: Record<number, string> = {
        4: 'var(--radius-sm)',
        8: 'var(--radius-md)',
        12: 'var(--radius-lg)',
        16: 'var(--radius-xl)',
        24: 'var(--radius-2xl)',
      };

      issues.push({
        id: generateId('DT'),
        type: 'design-system',
        severity: 'low',
        viewport: snapshot.viewport.name,
        element: element.selector,
        message: `Hardcoded border-radius? Karen's design token police are watching.`,
        details: {
          property: 'borderRadius',
          currentValue: borderRadius,
          suggestedToken: tokenNames[radiusValue],
        },
        fix: {
          suggestion: 'Use CSS variable for border-radius',
          code: {
            file: 'styles/borders.css',
            before: `${element.selector} {\n  border-radius: ${borderRadius};\n}`,
            after: `${element.selector} {\n  border-radius: ${tokenNames[radiusValue]};\n}`,
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Check if font sizes should use tokens
 */
function checkTypographyTokens(
  element: any,
  snapshot: ViewportSnapshot,
  config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];

  const fontSize = element.computedStyle.fontSize;
  if (fontSize && !fontSize.includes('var(') && !fontSize.includes('rem')) {
    const sizeValue = parseFloat(fontSize);

    // Check if font size is on the typescale
    if (config.typescale.sizes.includes(sizeValue)) {
      const sizeIndex = config.typescale.sizes.indexOf(sizeValue);
      const tokenName = `var(--text-${['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'][sizeIndex]})`;

      issues.push({
        id: generateId('DT'),
        type: 'design-system',
        severity: 'low',
        viewport: snapshot.viewport.name,
        element: element.selector,
        message: `Hardcoded font size? Karen demands typography tokens.`,
        details: {
          property: 'fontSize',
          currentValue: fontSize,
          typescale: config.typescale.sizes,
          suggestedToken: tokenName,
        },
        fix: {
          suggestion: 'Use CSS variable from typography scale',
          code: {
            file: 'styles/typography.css',
            before: `${element.selector} {\n  font-size: ${fontSize};\n}`,
            after: `${element.selector} {\n  font-size: ${tokenName};\n}`,
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Helper: Normalize color to hex format
 */
function normalizeColor(color: string): string | null {
  if (!color || color === 'transparent') return null;

  if (color.startsWith('#')) {
    return color.toUpperCase();
  }

  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

    if (a === 0) return null;

    return rgbToHex(r, g, b);
  }

  return null;
}

/**
 * Helper: Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
      .toUpperCase()
  );
}

/**
 * Helper: Calculate color distance
 */
function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const rMean = (rgb1.r + rgb2.r) / 2;
  const r = rgb1.r - rgb2.r;
  const g = rgb1.g - rgb2.g;
  const b = rgb1.b - rgb2.b;

  const weightR = 2 + rMean / 256;
  const weightG = 4;
  const weightB = 2 + (255 - rMean) / 256;

  return Math.sqrt(weightR * r * r + weightG * g * g + weightB * b * b);
}

/**
 * Helper: Parse hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
