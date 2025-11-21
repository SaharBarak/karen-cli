/**
 * Responsive Design & Media Query Enforcement
 * Detects missing responsive styles and improper media query usage
 */

import type { ViewportSnapshot, Issue } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';
import { generateId } from '../utils/id.js';

/**
 * Main responsive design enforcement function
 */
export function enforceResponsiveDesign(
  snapshots: ViewportSnapshot[],
  config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];

  // Compare same element across different viewports
  issues.push(...detectNonResponsiveElements(snapshots, config));

  // Check for excessive fixed widths
  issues.push(...detectFixedWidths(snapshots));

  // Check for elements that overflow on smaller screens
  issues.push(...detectResponsiveOverflow(snapshots));

  return issues;
}

/**
 * Detect elements that don't change across viewports (not responsive)
 */
function detectNonResponsiveElements(
  snapshots: ViewportSnapshot[],
  _config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];

  // Group snapshots by element selector
  const elementsBySelector = new Map<string, Map<string, any>>();

  for (const snapshot of snapshots) {
    for (const element of snapshot.dom) {
      if (!elementsBySelector.has(element.selector)) {
        elementsBySelector.set(element.selector, new Map());
      }
      elementsBySelector.get(element.selector)!.set(snapshot.viewport.name, {
        element,
        viewport: snapshot.viewport,
      });
    }
  }

  // Analyze each element across viewports
  for (const [selector, viewportData] of elementsBySelector) {
    if (viewportData.size < 3) continue; // Need at least 3 viewports to compare

    const viewports = Array.from(viewportData.entries());
    const fontSizes = viewports.map(([, data]) =>
      parseFloat(data.element.computedStyle.fontSize || '16')
    );
    const paddings = viewports.map(([, data]) => data.element.computedStyle.padding);
    const widths = viewports.map(([, data]) => data.element.computedStyle.width);

    // Check if font size is fixed across all viewports
    const uniqueFontSizes = new Set(fontSizes);
    if (uniqueFontSizes.size === 1) {
      const fontSize = fontSizes[0];
      if (fontSize > 24) {
        // Large text should scale down on mobile
        issues.push({
          id: generateId('RWD'),
          type: 'design-system',
          severity: 'medium',
          viewport: 'all',
          element: selector,
          message: `Fixed ${Math.round(fontSize)}px font on all screens? Karen demands responsive typography.`,
          details: {
            property: 'font-size',
            fixedValue: `${Math.round(fontSize)}px`,
            viewports: viewports.map(([name, data]) => ({
              name,
              width: data.viewport.width,
              fontSize: `${Math.round(fontSize)}px`,
            })),
            recommendation: 'Use clamp() or media queries for responsive scaling',
          },
          fix: {
            suggestion: 'Use clamp() for fluid typography that scales with viewport',
            code: {
              file: 'styles/typography.css',
              before: `${selector} {\n  font-size: ${Math.round(fontSize)}px;\n}`,
              after: `${selector} {\n  font-size: clamp(${Math.round(fontSize * 0.5)}px, ${Math.round(fontSize * 0.05)}vw + ${Math.round(fontSize * 0.3)}px, ${Math.round(fontSize)}px);\n}`,
              explanation:
                'clamp() allows text to scale fluidly between minimum (mobile) and maximum (desktop) sizes',
            },
          },
        });
      }
    }

    // Check if padding is fixed across all viewports
    const uniquePaddings = new Set(paddings);
    if (uniquePaddings.size === 1) {
      const padding = paddings[0];
      if (padding && padding !== '0px') {
        const paddingValues = padding.split(' ').map((v: string) => parseInt(v));
        const maxPadding = Math.max(...paddingValues);

        if (maxPadding > 32) {
          // Large padding should reduce on mobile
          issues.push({
            id: generateId('RWD'),
            type: 'design-system',
            severity: 'medium',
            viewport: 'all',
            element: selector,
            message: `${maxPadding}px padding on mobile? Karen's concerned about your spacing strategy.`,
            details: {
              property: 'padding',
              fixedValue: padding,
              maxPadding: maxPadding,
              viewports: viewports.map(([name, data]) => ({
                name,
                width: data.viewport.width,
              })),
            },
            fix: {
              suggestion: 'Use media queries to reduce padding on smaller screens',
              code: {
                file: 'styles/responsive.css',
                before: `${selector} {\n  padding: ${padding};\n}`,
                after: `${selector} {\n  padding: ${Math.round(maxPadding * 0.5)}px; /* Mobile */\n}\n\n@media (min-width: 768px) {\n  ${selector} {\n    padding: ${padding}; /* Tablet+ */\n  }\n}`,
                explanation: 'Mobile-first approach with increased padding on larger screens',
              },
            },
          });
        }
      }
    }

    // Check for fixed pixel widths
    const fixedWidthCount = widths.filter(
      (w) => w && w.endsWith('px') && parseInt(w) > 600
    ).length;
    if (fixedWidthCount === viewports.length) {
      const width = widths[0];
      issues.push({
        id: generateId('RWD'),
        type: 'design-system',
        severity: 'high',
        viewport: 'all',
        element: selector,
        message: `Fixed width in pixels? On ALL screen sizes? Karen's design sense is offended.`,
        details: {
          property: 'width',
          fixedValue: width,
          viewports: viewports.map(([name, _data]) => name),
        },
        fix: {
          suggestion: 'Use relative units (%, vw) or max-width for responsive layouts',
          code: {
            file: 'styles/layout.css',
            before: `${selector} {\n  width: ${width};\n}`,
            after: `${selector} {\n  width: 100%;\n  max-width: ${width};\n}`,
            explanation: 'Allows element to shrink on smaller screens while maintaining max width',
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Detect excessive use of fixed widths
 */
function detectFixedWidths(snapshots: ViewportSnapshot[]): Issue[] {
  const issues: Issue[] = [];

  // Check on mobile viewport only
  const mobileSnapshot = snapshots.find(
    (s) => s.viewport.width <= 414 && s.viewport.width >= 320
  );
  if (!mobileSnapshot) return issues;

  for (const element of mobileSnapshot.dom) {
    const width = element.computedStyle.width;
    if (!width || !width.endsWith('px')) continue;

    const widthValue = parseInt(width);
    const viewportWidth = mobileSnapshot.viewport.width;

    // Check if element width exceeds viewport
    if (widthValue > viewportWidth) {
      issues.push({
        id: generateId('RWD'),
        type: 'overflow',
        severity: 'high',
        viewport: mobileSnapshot.viewport.name,
        element: element.selector,
        message: `Fixed width of ${widthValue}px on a ${viewportWidth}px screen? Math isn't your strong suit, is it?`,
        details: {
          elementWidth: widthValue,
          viewportWidth: viewportWidth,
          overflow: widthValue - viewportWidth,
        },
        fix: {
          suggestion: 'Use responsive width or max-width constraint',
          code: {
            file: 'styles/responsive.css',
            before: `${element.selector} {\n  width: ${width};\n}`,
            after: `${element.selector} {\n  width: 100%;\n  max-width: ${width};\n}`,
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Detect elements that overflow on smaller screens
 */
function detectResponsiveOverflow(snapshots: ViewportSnapshot[]): Issue[] {
  const issues: Issue[] = [];

  // Compare desktop to mobile
  const desktopSnapshot = snapshots.find((s) => s.viewport.width >= 1440);
  const mobileSnapshot = snapshots.find((s) => s.viewport.width <= 414);

  if (!desktopSnapshot || !mobileSnapshot) return issues;

  // Find elements that exist on both
  const mobileSelectors = new Set(mobileSnapshot.dom.map((el) => el.selector));

  for (const desktopElement of desktopSnapshot.dom) {
    if (!mobileSelectors.has(desktopElement.selector)) continue;

    const mobileElement = mobileSnapshot.dom.find(
      (el) => el.selector === desktopElement.selector
    );
    if (!mobileElement) continue;

    // Check if element is much wider on desktop and might not scale properly
    const desktopWidth = desktopElement.rect.width;
    const mobileWidth = mobileElement.rect.width;

    if (desktopWidth > 800 && mobileWidth > mobileSnapshot.viewport.width * 0.9) {
      // Element takes up > 90% of mobile viewport
      issues.push({
        id: generateId('RWD'),
        type: 'design-system',
        severity: 'medium',
        viewport: mobileSnapshot.viewport.name,
        element: desktopElement.selector,
        message: `Element barely fits on mobile but looks fine on desktop? Sounds like missing responsive styles.`,
        details: {
          desktopWidth: Math.round(desktopWidth),
          mobileWidth: Math.round(mobileWidth),
          mobileViewport: mobileSnapshot.viewport.width,
          widthRatio: ((mobileWidth / mobileSnapshot.viewport.width) * 100).toFixed(1) + '%',
        },
        fix: {
          suggestion: 'Ensure proper responsive behavior with flexible layouts',
          code: {
            file: 'styles/responsive.css',
            before: `${desktopElement.selector} {\n  /* May need responsive adjustments */\n}`,
            after: `${desktopElement.selector} {\n  width: 100%;\n  max-width: 100%;\n  box-sizing: border-box;\n}\n\n@media (min-width: 768px) {\n  ${desktopElement.selector} {\n    max-width: 800px;\n  }\n}`,
          },
        },
      });
    }
  }

  return issues;
}
