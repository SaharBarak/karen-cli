/**
 * Design System Chaos Detector
 * Detects inconsistencies in component styling (buttons, inputs, cards, etc.)
 */

import type { ViewportSnapshot, Issue, DOMElement } from '../types/audit.js';
import { generateId } from '../utils/id.js';

interface ButtonStyle {
  borderRadius: string;
  padding: string;
  fontSize: string;
  fontWeight: string;
  backgroundColor: string;
  color: string;
  border: string;
  element: string;
}

interface InputStyle {
  borderRadius: string;
  padding: string;
  fontSize: string;
  border: string;
  height: string;
  element: string;
}

interface CardStyle {
  borderRadius: string;
  padding: string;
  backgroundColor: string;
  boxShadow: string;
  border: string;
  element: string;
}

/**
 * Main design system chaos detection function
 */
export function detectDesignSystemChaos(snapshots: ViewportSnapshot[]): Issue[] {
  const issues: Issue[] = [];

  // Analyze button inconsistencies
  issues.push(...analyzeButtonVariations(snapshots));

  // Analyze input field variations
  issues.push(...analyzeInputVariations(snapshots));

  // Analyze card component variations
  issues.push(...analyzeCardVariations(snapshots));

  // Analyze heading inconsistencies
  issues.push(...analyzeHeadingInconsistencies(snapshots));

  return issues;
}

/**
 * Analyze button styling inconsistencies
 */
function analyzeButtonVariations(snapshots: ViewportSnapshot[]): Issue[] {
  const issues: Issue[] = [];
  const buttons: ButtonStyle[] = [];

  // Collect all buttons across viewports
  for (const snapshot of snapshots) {
    const buttonElements = snapshot.dom.filter(
      (el: DOMElement) =>
        el.tagName === 'BUTTON' ||
        el.tagName === 'A' && (
          el.classes.some((c: string) => c.includes('btn') || c.includes('button')) ||
          el.computedStyle.display === 'inline-block' ||
          el.computedStyle.display === 'inline-flex'
        ) ||
        el.classes.some((c: string) => c.includes('btn') || c.includes('button'))
    );

    for (const btn of buttonElements) {
      buttons.push({
        borderRadius: btn.computedStyle.borderRadius || '0px',
        padding: btn.computedStyle.padding || '0px',
        fontSize: btn.computedStyle.fontSize || '16px',
        fontWeight: btn.computedStyle.fontWeight || '400',
        backgroundColor: btn.computedStyle.backgroundColor || 'transparent',
        color: btn.computedStyle.color || '#000000',
        border: btn.computedStyle.border || 'none',
        element: btn.selector,
      });
    }
  }

  if (buttons.length === 0) {
    return issues;
  }

  // Group buttons by style signature
  const styleSignatures = new Map<string, ButtonStyle[]>();

  for (const btn of buttons) {
    const signature = createStyleSignature(btn);
    if (!styleSignatures.has(signature)) {
      styleSignatures.set(signature, []);
    }
    styleSignatures.get(signature)!.push(btn);
  }

  const uniqueStyles = styleSignatures.size;

  // Flag if too many variations (threshold: > 5)
  if (uniqueStyles > 5) {
    const variationsList = Array.from(styleSignatures.entries())
      .map(([_sig, btns]) => ({
        count: btns.length,
        example: btns[0],
      }))
      .sort((a, b) => b.count - a.count);

    issues.push({
      id: generateId('DS'),
      type: 'design-system',
      severity: 'high',
      viewport: 'all',
      element: 'Button components',
      message: `Buttons in ${uniqueStyles} different styles? Karen's documenting every inconsistency.`,
      details: {
        totalButtons: buttons.length,
        uniqueStyles: uniqueStyles,
        variations: variationsList.slice(0, 10).map((v) => ({
          count: v.count,
          borderRadius: v.example.borderRadius,
          padding: v.example.padding,
          fontSize: v.example.fontSize,
          backgroundColor: v.example.backgroundColor,
        })),
      },
      fix: {
        suggestion: `Create a Button component with consistent variants (primary, secondary, ghost)`,
        code: {
          file: 'components/Button.tsx',
          before: `// ${uniqueStyles} different button styles scattered across your code`,
          after: `// Define standard button variants
const buttonVariants = {
  primary: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#0066FF',
    color: '#FFFFFF'
  },
  secondary: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: 'transparent',
    border: '2px solid #0066FF',
    color: '#0066FF'
  },
  ghost: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: 'transparent',
    color: '#0066FF'
  }
}`,
        },
      },
    });
  }

  // Check for inconsistent border radius
  const borderRadii = new Set(buttons.map((b) => b.borderRadius));
  if (borderRadii.size > 3 && buttons.length > 5) {
    issues.push({
      id: generateId('DS'),
      type: 'design-system',
      severity: 'medium',
      viewport: 'all',
      element: 'Button border-radius',
      message: `Button border-radius all over the place? Pick ONE system, sweetie.`,
      details: {
        uniqueBorderRadii: Array.from(borderRadii),
        count: borderRadii.size,
      },
      fix: {
        suggestion: `Standardize button border-radius to a single value or use design tokens`,
        code: {
          file: 'styles/buttons.css',
          before: `border-radius: ${Array.from(borderRadii).slice(0, 3).join(', ')}, ...`,
          after: `border-radius: var(--border-radius-button, 8px);`,
        },
      },
    });
  }

  // Check for inconsistent padding
  const paddings = new Set(buttons.map((b) => normalizedPadding(b.padding)));
  if (paddings.size > 4 && buttons.length > 5) {
    issues.push({
      id: generateId('DS'),
      type: 'design-system',
      severity: 'medium',
      viewport: 'all',
      element: 'Button padding',
      message: `Random button padding values? Karen's judging your spacing tokens.`,
      details: {
        uniquePaddings: Array.from(paddings),
        count: paddings.size,
      },
      fix: {
        suggestion: `Use consistent padding values from your spacing scale`,
        code: {
          file: 'styles/buttons.css',
          before: `padding: ${Array.from(paddings).slice(0, 3).join(', ')}, ...`,
          after: `padding: var(--spacing-3) var(--spacing-6); /* 12px 24px */`,
        },
      },
    });
  }

  return issues;
}

/**
 * Create a style signature for comparison
 */
function createStyleSignature(style: ButtonStyle): string {
  return JSON.stringify({
    borderRadius: style.borderRadius,
    padding: normalizedPadding(style.padding),
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    backgroundColor: style.backgroundColor,
    border: style.border,
  });
}

/**
 * Normalize padding for comparison
 * Converts "10px 20px" and "10px 20px 10px 20px" to same format
 */
function normalizedPadding(padding: string): string {
  const values = padding.split(/\s+/);

  if (values.length === 1) {
    return padding; // "10px"
  } else if (values.length === 2) {
    return padding; // "10px 20px"
  } else if (values.length === 4) {
    // "10px 20px 10px 20px" -> "10px 20px"
    if (values[0] === values[2] && values[1] === values[3]) {
      return `${values[0]} ${values[1]}`;
    }
  }

  return padding;
}

/**
 * Analyze input field styling inconsistencies
 */
function analyzeInputVariations(snapshots: ViewportSnapshot[]): Issue[] {
  const issues: Issue[] = [];
  const inputs: InputStyle[] = [];

  // Collect all input fields across viewports
  for (const snapshot of snapshots) {
    const inputElements = snapshot.dom.filter(
      (el: DOMElement) =>
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.classes.some((c: string) => c.includes('input') || c.includes('field'))
    );

    for (const input of inputElements) {
      inputs.push({
        borderRadius: input.computedStyle.borderRadius || '0px',
        padding: input.computedStyle.padding || '0px',
        fontSize: input.computedStyle.fontSize || '16px',
        border: input.computedStyle.border || 'none',
        height: input.computedStyle.height || 'auto',
        element: input.selector,
      });
    }
  }

  if (inputs.length === 0) return issues;

  // Check for inconsistent input heights
  const heights = new Set(inputs.map((i) => i.height));
  if (heights.size > 3 && inputs.length > 3) {
    issues.push({
      id: generateId('DS'),
      type: 'design-system',
      severity: 'medium',
      viewport: 'all',
      element: 'Input fields',
      message: `Input fields with ${heights.size} different heights? Karen demands consistency.`,
      details: {
        totalInputs: inputs.length,
        uniqueHeights: Array.from(heights),
      },
      fix: {
        suggestion: 'Standardize input heights to 2-3 sizes (small, medium, large)',
        code: {
          file: 'styles/forms.css',
          before: `input { height: ${Array.from(heights).slice(0, 3).join(', ')}, ... }`,
          after: `input {\n  height: var(--input-height, 40px);\n  padding: var(--spacing-2) var(--spacing-3);\n}`,
        },
      },
    });
  }

  // Check for inconsistent borders
  const borders = new Set(inputs.map((i) => i.border));
  if (borders.size > 3 && inputs.length > 3) {
    issues.push({
      id: generateId('DS'),
      type: 'design-system',
      severity: 'medium',
      viewport: 'all',
      element: 'Input borders',
      message: `Input borders all over the place? Design systems exist for a reason.`,
      details: {
        totalInputs: inputs.length,
        uniqueBorders: Array.from(borders).slice(0, 5),
      },
      fix: {
        suggestion: 'Use consistent border styling for all inputs',
        code: {
          file: 'styles/forms.css',
          before: `/* Inconsistent borders */`,
          after: `input, textarea, select {\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-md);\n}`,
        },
      },
    });
  }

  return issues;
}

/**
 * Analyze card component styling inconsistencies
 */
function analyzeCardVariations(snapshots: ViewportSnapshot[]): Issue[] {
  const issues: Issue[] = [];
  const cards: CardStyle[] = [];

  // Collect all card-like elements across viewports
  for (const snapshot of snapshots) {
    const cardElements = snapshot.dom.filter(
      (el: DOMElement) =>
        el.classes.some((c: string) =>
          c.includes('card') || c.includes('panel') || c.includes('box')
        ) ||
        (el.tagName === 'ARTICLE' || el.tagName === 'SECTION')
    );

    for (const card of cardElements) {
      cards.push({
        borderRadius: card.computedStyle.borderRadius || '0px',
        padding: card.computedStyle.padding || '0px',
        backgroundColor: card.computedStyle.backgroundColor || 'transparent',
        boxShadow: card.computedStyle.boxShadow || 'none',
        border: card.computedStyle.border || 'none',
        element: card.selector,
      });
    }
  }

  if (cards.length === 0) return issues;

  // Check for inconsistent box shadows
  const shadows = new Set(cards.map((c) => c.boxShadow));
  if (shadows.size > 4 && cards.length > 3) {
    issues.push({
      id: generateId('DS'),
      type: 'design-system',
      severity: 'medium',
      viewport: 'all',
      element: 'Card shadows',
      message: `Card shadows in ${shadows.size} different styles? Karen's shadow game is stronger.`,
      details: {
        totalCards: cards.length,
        uniqueShadows: shadows.size,
      },
      fix: {
        suggestion: 'Define 2-3 shadow levels in your design system',
        code: {
          file: 'styles/cards.css',
          before: `/* Multiple shadow variations */`,
          after: `.card {\n  box-shadow: var(--shadow-md);\n  border-radius: var(--radius-lg);\n  padding: var(--spacing-4);\n}\n\n/* Shadow scale */\n:root {\n  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);\n  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);\n  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);\n}`,
        },
      },
    });
  }

  // Check for inconsistent padding
  const cardPaddings = new Set(cards.map((c) => normalizedPadding(c.padding)));
  if (cardPaddings.size > 4 && cards.length > 3) {
    issues.push({
      id: generateId('DS'),
      type: 'design-system',
      severity: 'low',
      viewport: 'all',
      element: 'Card padding',
      message: `Random card padding values? Use your spacing scale, sweetie.`,
      details: {
        totalCards: cards.length,
        uniquePaddings: Array.from(cardPaddings),
      },
      fix: {
        suggestion: 'Standardize card padding using spacing tokens',
        code: {
          file: 'styles/cards.css',
          before: `padding: ${Array.from(cardPaddings).slice(0, 2).join(', ')}, ...`,
          after: `.card {\n  padding: var(--spacing-4);\n}\n\n.card--compact {\n  padding: var(--spacing-3);\n}`,
        },
      },
    });
  }

  return issues;
}

/**
 * Analyze heading typography inconsistencies
 */
function analyzeHeadingInconsistencies(snapshots: ViewportSnapshot[]): Issue[] {
  const issues: Issue[] = [];
  const headings = new Map<string, Set<string>>();

  // Collect all headings across viewports
  for (const snapshot of snapshots) {
    const headingElements = snapshot.dom.filter(
      (el: DOMElement) =>
        ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)
    );

    for (const heading of headingElements) {
      const tag = heading.tagName;
      if (!headings.has(tag)) {
        headings.set(tag, new Set());
      }
      headings.get(tag)!.add(heading.computedStyle.fontSize || '16px');
    }
  }

  // Check each heading level for consistency
  for (const [tag, fontSizes] of headings.entries()) {
    if (fontSizes.size > 2) {
      issues.push({
        id: generateId('DS'),
        type: 'design-system',
        severity: 'medium',
        viewport: 'all',
        element: tag,
        message: `${tag} tags with ${fontSizes.size} different sizes? Karen enforces typographic hierarchy.`,
        details: {
          tag: tag,
          fontSizes: Array.from(fontSizes),
        },
        fix: {
          suggestion: `Standardize ${tag} font size across your application`,
          code: {
            file: 'styles/typography.css',
            before: `${tag.toLowerCase()} { font-size: ${Array.from(fontSizes)[0]}; } /* inconsistent */`,
            after: `${tag.toLowerCase()} {\n  font-size: var(--text-${tag.toLowerCase()});\n  line-height: 1.2;\n  font-weight: 600;\n}`,
          },
        },
      });
    }
  }

  return issues;
}
