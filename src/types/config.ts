/**
 * Karen CLI Configuration Types
 */

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export interface Typescale {
  base: number;
  ratio: number;
  sizes: number[];
}

export interface ContrastRatios {
  AA: number;
  AAA: number;
}

export interface LineLength {
  minCh: number;
  maxCh: number;
}

export type AuditFeature =
  | 'overflow'
  | 'spacing'
  | 'typescale'
  | 'colors'
  | 'accessibility'
  | 'design-system';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface KarenConfig {
  spacingScale: number[];
  typescale: Typescale;
  colorPalette: string[];
  breakpoints: Viewport[];
  lineLength: LineLength;
  alignTolerancePx: number;
  contrastRatios: ContrastRatios;
  failOn: IssueSeverity[];
  features: AuditFeature[];
  anthropicApiKey?: string;
  outputFormat: 'json' | 'markdown' | 'both';
  outputDir: string;
}

export const defaultConfig: KarenConfig = {
  spacingScale: [0, 4, 8, 12, 16, 24, 32, 48, 64],
  typescale: {
    base: 16,
    ratio: 1.25,
    sizes: [12, 14, 16, 20, 25, 31, 39, 49],
  },
  colorPalette: [
    '#F5E6D3',
    '#D4A574',
    '#8B7355',
    '#E8998D',
    '#9CA986',
    '#B4A7D6',
  ],
  breakpoints: [
    { name: 'xs-mobile', width: 320, height: 568 },     // iPhone 5/SE
    { name: 'mobile', width: 375, height: 667 },        // iPhone 6/7/8
    { name: 'lg-mobile', width: 414, height: 896 },     // iPhone Pro Max
    { name: 'sm-tablet', width: 600, height: 960 },     // Small tablets
    { name: 'tablet', width: 768, height: 1024 },       // iPad portrait
    { name: 'lg-tablet', width: 1024, height: 1366 },   // iPad landscape
    { name: 'desktop', width: 1440, height: 900 },      // Standard laptop
    { name: 'lg-desktop', width: 1920, height: 1080 },  // Full HD
    { name: 'ultrawide', width: 2560, height: 1440 },   // 2K monitors
  ],
  lineLength: { minCh: 45, maxCh: 75 },
  alignTolerancePx: 4,
  contrastRatios: {
    AA: 4.5,
    AAA: 7.0,
  },
  failOn: ['critical', 'high'],
  features: ['overflow', 'spacing', 'typescale', 'colors', 'accessibility', 'design-system'],
  outputFormat: 'both',
  outputDir: './karen-output',
};
