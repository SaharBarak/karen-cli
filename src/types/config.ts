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
  | 'design-system'
  | 'performance';

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
    // === SMARTWATCHES ===
    { name: 'Apple Watch 40mm', width: 162, height: 197 },
    { name: 'Apple Watch 44mm', width: 184, height: 224 },
    { name: 'Samsung Watch', width: 180, height: 180 },
    { name: 'Huawei Watch GT', width: 227, height: 227 },

    // === SMALL MOBILE (320-360px) ===
    { name: 'iPhone 5/5s/5c/SE (2016)', width: 320, height: 568 },
    { name: 'Samsung Galaxy S6/S7', width: 360, height: 640 },
    { name: 'Samsung Galaxy S8/S9', width: 360, height: 740 },
    { name: 'Samsung Galaxy S10', width: 360, height: 760 },
    { name: 'Samsung Galaxy S20', width: 360, height: 800 },
    { name: 'Samsung Galaxy S23/S24', width: 360, height: 780 },
    { name: 'iPhone 12/13 mini', width: 360, height: 780 },
    { name: 'LG G4/G5/G6', width: 360, height: 640 },
    { name: 'Google Nexus 5', width: 360, height: 640 },

    // === STANDARD MOBILE (375-414px) ===
    { name: 'iPhone 6/6s/7/8/SE 2020/SE 2022', width: 375, height: 667 },
    { name: 'iPhone X/11 Pro', width: 375, height: 812 },
    { name: 'iPhone 12/13/14/15 Pro', width: 390, height: 844 },
    { name: 'iPhone 13/14/15/16', width: 393, height: 852 },
    { name: 'iPhone 16 Pro', width: 402, height: 874 },
    { name: 'iPhone 8 Plus', width: 414, height: 736 },
    { name: 'iPhone XR/11/11 Pro Max', width: 414, height: 896 },
    { name: 'Samsung Galaxy S10+', width: 412, height: 869 },
    { name: 'Samsung Galaxy S20 FE/Ultra', width: 412, height: 915 },
    { name: 'Samsung Galaxy S21 Ultra', width: 384, height: 854 },
    { name: 'Samsung Galaxy Note 20', width: 412, height: 915 },
    { name: 'Samsung Galaxy A51/A71', width: 412, height: 915 },
    { name: 'Google Pixel 2/3/4/5', width: 393, height: 851 },
    { name: 'Google Pixel 4 XL', width: 412, height: 869 },
    { name: 'OnePlus 6/7/8/9/10', width: 412, height: 915 },
    { name: 'Xiaomi Mi 9/10', width: 393, height: 851 },
    { name: 'Xiaomi Redmi Note 9', width: 393, height: 873 },
    { name: 'Huawei P30/P40', width: 360, height: 780 },

    // === LARGE/PRO MOBILE (428-440px) ===
    { name: 'iPhone 12/13 Pro Max', width: 428, height: 926 },
    { name: 'iPhone 14 Plus', width: 428, height: 926 },
    { name: 'iPhone 14/15 Pro Max', width: 430, height: 932 },
    { name: 'iPhone 15/16 Plus', width: 430, height: 932 },
    { name: 'iPhone 16 Pro Max', width: 440, height: 956 },

    // === FOLDABLE PHONES ===
    { name: 'Samsung Galaxy Z Flip', width: 412, height: 1004 },
    { name: 'Samsung Galaxy Z Fold (unfolded)', width: 768, height: 1076 },
    { name: 'Samsung Galaxy Z Fold2 (unfolded)', width: 884, height: 1104 },

    // === SMALL TABLETS (600-768px) ===
    { name: 'Small Android Tablet', width: 600, height: 960 },
    { name: 'iPad Mini', width: 768, height: 1024 },

    // === STANDARD TABLETS (768-834px) ===
    { name: 'iPad 10.2"', width: 810, height: 1080 },
    { name: 'iPad Air', width: 820, height: 1180 },
    { name: 'iPad Air (older)', width: 834, height: 1112 },
    { name: 'iPad Pro 11"', width: 834, height: 1194 },

    // === LARGE TABLETS (1024px+) ===
    { name: 'iPad Pro 12.9"', width: 1024, height: 1366 },
    { name: 'Microsoft Surface 3', width: 1280, height: 720 },
    { name: 'Huawei MatePad Pro', width: 1280, height: 800 },

    // === LAPTOPS (1280-1536px) ===
    { name: 'MacBook Air 13.3"', width: 1280, height: 800 },
    { name: 'MacBook Pro 13.3"', width: 1280, height: 800 },
    { name: 'Microsoft Surface Pro', width: 1368, height: 912 },
    { name: 'Microsoft Surface Laptop 13.5"', width: 1504, height: 1003 },
    { name: 'MacBook Pro 16"', width: 1536, height: 960 },
    { name: 'Microsoft Surface Book', width: 1500, height: 1000 },
    { name: 'Microsoft Surface Laptop 15"', width: 1664, height: 1110 },

    // === DESKTOP HD/FULL HD (1366-1920px) ===
    { name: 'Desktop HD', width: 1366, height: 768 },
    { name: 'Desktop HD+', width: 1600, height: 900 },
    { name: 'MacBook Pro 15"', width: 1440, height: 900 },
    { name: 'Desktop Full HD', width: 1920, height: 1080 },

    // === DESKTOP 2K/QHD (2560px) ===
    { name: 'Desktop 2K/QHD', width: 2560, height: 1440 },
    { name: 'Desktop WQHD', width: 2560, height: 1600 },

    // === DESKTOP 4K UHD (3840px) ===
    { name: 'Desktop 4K UHD', width: 3840, height: 2160 },
    { name: 'Desktop 4K DCI', width: 4096, height: 2160 },

    // === ULTRAWIDE MONITORS ===
    { name: 'Ultrawide HD (21:9)', width: 2560, height: 1080 },
    { name: 'Ultrawide QHD (21:9)', width: 3440, height: 1440 },
    { name: 'Ultrawide 5K2K (21:9)', width: 5120, height: 2160 },
    { name: 'Super Ultrawide 32:9', width: 5120, height: 1440 },
    { name: 'Dual UHD (32:9)', width: 7680, height: 2160 },

    // === HIGH-END DISPLAYS (5K-8K) ===
    { name: 'iMac 5K Retina', width: 5120, height: 2880 },
    { name: 'Apple Pro Display XDR', width: 6016, height: 3384 },
    { name: 'Desktop 8K UHD', width: 7680, height: 4320 },
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
