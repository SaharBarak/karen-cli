/**
 * Color Palette Consistency Detector
 * Detects near-duplicate colors and validates against configured palette
 */

import type { ViewportSnapshot, Issue } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';
import { generateId } from '../utils/id.js';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ColorUsage {
  count: number;
  elements: string[];
}

/**
 * Main color analysis function
 */
export function analyzeColors(
  snapshots: ViewportSnapshot[],
  config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];
  const palette = config.colorPalette;
  const usedColors = new Map<string, ColorUsage>();

  // Collect all colors used across all viewports
  for (const snapshot of snapshots) {
    for (const element of snapshot.dom) {
      const colors = [
        element.computedStyle.color,
        element.computedStyle.backgroundColor,
        element.computedStyle.borderColor,
        element.computedStyle.borderTopColor,
        element.computedStyle.borderRightColor,
        element.computedStyle.borderBottomColor,
        element.computedStyle.borderLeftColor,
      ].filter((c) => c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)');

      for (const color of colors) {
        const normalized = normalizeColor(color);
        if (!normalized) continue;

        if (!usedColors.has(normalized)) {
          usedColors.set(normalized, { count: 0, elements: [] });
        }
        const usage = usedColors.get(normalized)!;
        usage.count++;
        if (!usage.elements.includes(element.selector)) {
          usage.elements.push(element.selector);
        }
      }
    }
  }

  // Find near-duplicate colors
  const colorArray = Array.from(usedColors.entries());
  const processedPairs = new Set<string>();

  for (let i = 0; i < colorArray.length; i++) {
    for (let j = i + 1; j < colorArray.length; j++) {
      const [color1, data1] = colorArray[i];
      const [color2, data2] = colorArray[j];

      const pairKey = [color1, color2].sort().join('|');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const distance = colorDistance(color1, color2);

      // Near-duplicate colors (very similar but not identical)
      if (distance > 0 && distance < 15) {
        issues.push({
          id: generateId('CLR'),
          type: 'colors',
          severity: 'medium',
          viewport: 'all',
          element: 'Multiple elements',
          message: `Using ${color1} AND ${color2}? Karen's not having it. Pick a system.`,
          details: {
            color1,
            color2,
            distance: Math.round(distance * 100) / 100,
            occurrences1: data1.count,
            occurrences2: data2.count,
            affectedElements: [...new Set([...data1.elements, ...data2.elements])].slice(0, 5),
          },
          fix: {
            suggestion: `Consolidate to a single color. Use ${color1} (${data1.count} occurrences) or ${color2} (${data2.count} occurrences).`,
            code: {
              file: 'styles/colors.css',
              before: `color: ${color2};`,
              after: `color: ${color1};`,
            },
          },
        });
      }
    }
  }

  // Check if colors are on configured palette
  for (const [color, data] of usedColors) {
    // Skip if color is very common (likely intentional)
    if (data.count < 3) continue;

    const nearestPaletteColor = findNearestColor(color, palette);
    const distanceToPalette = colorDistance(color, nearestPaletteColor);

    // Color is not in palette (distance > 20)
    if (distanceToPalette > 20) {
      issues.push({
        id: generateId('CLR'),
        type: 'colors',
        severity: 'low',
        viewport: 'all',
        element: data.elements[0],
        message: `Color ${color} isn't in your palette. Karen suggests picking from your design system.`,
        details: {
          color,
          nearestPaletteColor,
          distanceToPalette: Math.round(distanceToPalette * 100) / 100,
          occurrences: data.count,
          palette,
        },
        fix: {
          suggestion: `Use ${nearestPaletteColor} from your color palette instead`,
          code: {
            file: 'styles/colors.css',
            before: `color: ${color};`,
            after: `color: ${nearestPaletteColor};`,
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Normalize color to hex format
 */
function normalizeColor(color: string): string | null {
  if (!color || color === 'transparent') return null;

  // Already hex
  if (color.startsWith('#')) {
    return color.toUpperCase();
  }

  // RGB/RGBA format
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

    // Skip fully transparent
    if (a === 0) return null;

    return rgbToHex(r, g, b);
  }

  // Named colors (basic support)
  const namedColors: Record<string, string> = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#FF0000',
    green: '#008000',
    blue: '#0000FF',
    yellow: '#FFFF00',
    cyan: '#00FFFF',
    magenta: '#FF00FF',
    gray: '#808080',
    grey: '#808080',
  };

  return namedColors[color.toLowerCase()] || null;
}

/**
 * Convert RGB to hex
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
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Calculate perceptual color distance (simplified deltaE)
 * Using weighted Euclidean distance in RGB space
 * Returns 0-100+ (lower = more similar)
 */
function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  // Weighted RGB distance (approximation of perceptual difference)
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
 * Find nearest color from palette
 */
function findNearestColor(color: string, palette: string[]): string {
  let nearestColor = palette[0];
  let minDistance = Infinity;

  for (const paletteColor of palette) {
    const distance = colorDistance(color, paletteColor);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = paletteColor;
    }
  }

  return nearestColor;
}
