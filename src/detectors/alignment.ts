/**
 * Alignment Detection
 * Detects misaligned elements using the configured tolerance
 */

import type { ViewportSnapshot, Issue, DOMElement } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';
import { generateId } from '../utils/id.js';

/**
 * Main alignment detection function
 */
export function detectMisalignment(
  snapshots: ViewportSnapshot[],
  config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];
  const tolerance = config.alignTolerancePx;

  for (const snapshot of snapshots) {
    // Check horizontal alignment (elements in same row)
    issues.push(...checkHorizontalAlignment(snapshot, tolerance));

    // Check vertical alignment (elements in same column)
    issues.push(...checkVerticalAlignment(snapshot, tolerance));

    // Check grid alignment
    issues.push(...checkGridAlignment(snapshot, tolerance));
  }

  return issues;
}

/**
 * Check if elements in the same row are horizontally aligned
 */
function checkHorizontalAlignment(
  snapshot: ViewportSnapshot,
  tolerance: number
): Issue[] {
  const issues: Issue[] = [];

  // Group elements by approximate Y position (rows)
  const rows = groupElementsByRow(snapshot.dom, tolerance);

  for (const row of rows) {
    if (row.length < 2) continue;

    // Check if all elements in row are aligned (same top position)
    const topPositions = row.map((el) => el.rect.y);
    const minTop = Math.min(...topPositions);
    const maxTop = Math.max(...topPositions);
    const misalignment = maxTop - minTop;

    if (misalignment > tolerance) {
      // Find the most common top position (baseline)
      const positionCounts = new Map<number, number>();
      for (const pos of topPositions) {
        positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
      }
      const baseline = Array.from(positionCounts.entries()).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0];

      // Find misaligned elements
      const misalignedElements = row.filter(
        (el) => Math.abs(el.rect.y - baseline) > tolerance
      );

      issues.push({
        id: generateId('ALN'),
        type: 'design-system',
        severity: 'medium',
        viewport: snapshot.viewport.name,
        element: misalignedElements.map((el) => el.selector).join(', '),
        message: `Elements not aligned horizontally? Karen's OCD is triggered. Fix your layout.`,
        details: {
          alignmentType: 'horizontal',
          misalignment: Math.round(misalignment),
          tolerance: tolerance,
          baseline: baseline,
          elements: row.map((el) => ({
            selector: el.selector,
            top: el.rect.y,
            diff: Math.abs(el.rect.y - baseline),
          })),
        },
        fix: {
          suggestion: `Align elements using flexbox or grid. Current misalignment: ${Math.round(misalignment)}px, tolerance: ${tolerance}px`,
          code: {
            file: 'styles/layout.css',
            before: `.container > * {\n  /* Elements misaligned by ${Math.round(misalignment)}px */\n}`,
            after: `.container {\n  display: flex;\n  align-items: center; /* or align-items: flex-start; */\n}`,
            explanation:
              'Using flexbox ensures all items in a row maintain consistent vertical alignment',
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Check if elements in the same column are vertically aligned
 */
function checkVerticalAlignment(
  snapshot: ViewportSnapshot,
  tolerance: number
): Issue[] {
  const issues: Issue[] = [];

  // Group elements by approximate X position (columns)
  const columns = groupElementsByColumn(snapshot.dom, tolerance);

  for (const column of columns) {
    if (column.length < 2) continue;

    // Check if all elements in column are aligned (same left position)
    const leftPositions = column.map((el) => el.rect.x);
    const minLeft = Math.min(...leftPositions);
    const maxLeft = Math.max(...leftPositions);
    const misalignment = maxLeft - minLeft;

    if (misalignment > tolerance) {
      const positionCounts = new Map<number, number>();
      for (const pos of leftPositions) {
        positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
      }
      const baseline = Array.from(positionCounts.entries()).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0];

      const misalignedElements = column.filter(
        (el) => Math.abs(el.rect.x - baseline) > tolerance
      );

      issues.push({
        id: generateId('ALN'),
        type: 'design-system',
        severity: 'medium',
        viewport: snapshot.viewport.name,
        element: misalignedElements.map((el) => el.selector).join(', '),
        message: `Vertical alignment is off? Karen notices EVERYTHING. Time to fix your columns.`,
        details: {
          alignmentType: 'vertical',
          misalignment: Math.round(misalignment),
          tolerance: tolerance,
          baseline: baseline,
          elements: column.map((el) => ({
            selector: el.selector,
            left: el.rect.x,
            diff: Math.abs(el.rect.x - baseline),
          })),
        },
        fix: {
          suggestion: `Align elements using grid or consistent margins. Current misalignment: ${Math.round(misalignment)}px, tolerance: ${tolerance}px`,
          code: {
            file: 'styles/layout.css',
            before: `.container > * {\n  /* Elements misaligned by ${Math.round(misalignment)}px */\n}`,
            after: `.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n  gap: 1rem;\n}`,
            explanation:
              'Using CSS Grid ensures consistent column alignment and spacing',
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Check grid-like layouts for consistent spacing
 */
function checkGridAlignment(snapshot: ViewportSnapshot, _tolerance: number): Issue[] {
  const issues: Issue[] = [];

  // Find potential grid containers (elements with multiple children)
  const gridContainers = snapshot.dom.filter(
    (el) => el.children && el.children.length >= 4
  );

  for (const container of gridContainers) {
    const children = container.children;
    if (children.length < 4) continue;

    // Check if children form a grid pattern
    const gaps = calculateGaps(children);

    if (gaps.horizontal.size > 3 || gaps.vertical.size > 3) {
      // Inconsistent gaps detected
      const avgHorizontalGap =
        Array.from(gaps.horizontal.values()).reduce((a, b) => a + b, 0) /
        gaps.horizontal.size;
      const avgVerticalGap =
        Array.from(gaps.vertical.values()).reduce((a, b) => a + b, 0) /
        gaps.vertical.size;

      issues.push({
        id: generateId('ALN'),
        type: 'design-system',
        severity: 'medium',
        viewport: snapshot.viewport.name,
        element: container.selector,
        message: `Inconsistent grid spacing? Karen demands perfect symmetry in your layouts.`,
        details: {
          alignmentType: 'grid',
          childCount: children.length,
          horizontalGaps: Array.from(gaps.horizontal.entries()).map(([gap, count]) => ({
            gap,
            count,
          })),
          verticalGaps: Array.from(gaps.vertical.entries()).map(([gap, count]) => ({
            gap,
            count,
          })),
          suggestedHorizontalGap: Math.round(avgHorizontalGap),
          suggestedVerticalGap: Math.round(avgVerticalGap),
        },
        fix: {
          suggestion: 'Use CSS Grid with consistent gap values',
          code: {
            file: 'styles/layout.css',
            before: `${container.selector} {\n  /* Inconsistent spacing */\n}`,
            after: `${container.selector} {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));\n  gap: ${Math.round(avgVerticalGap)}px ${Math.round(avgHorizontalGap)}px;\n}`,
            explanation: 'CSS Grid with consistent gap ensures uniform spacing between items',
          },
        },
      });
    }
  }

  return issues;
}

/**
 * Group elements by row (similar Y positions)
 */
function groupElementsByRow(
  elements: DOMElement[],
  tolerance: number
): DOMElement[][] {
  const sorted = [...elements].sort((a, b) => a.rect.y - b.rect.y);
  const rows: DOMElement[][] = [];
  let currentRow: DOMElement[] = [];
  let currentY = -Infinity;

  for (const el of sorted) {
    if (el.rect.width === 0 || el.rect.height === 0) continue; // Skip invisible elements

    if (Math.abs(el.rect.y - currentY) <= tolerance) {
      currentRow.push(el);
    } else {
      if (currentRow.length > 1) {
        // Only keep rows with multiple elements
        rows.push(currentRow);
      }
      currentRow = [el];
      currentY = el.rect.y;
    }
  }

  if (currentRow.length > 1) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Group elements by column (similar X positions)
 */
function groupElementsByColumn(
  elements: DOMElement[],
  tolerance: number
): DOMElement[][] {
  const sorted = [...elements].sort((a, b) => a.rect.x - b.rect.x);
  const columns: DOMElement[][] = [];
  let currentColumn: DOMElement[] = [];
  let currentX = -Infinity;

  for (const el of sorted) {
    if (el.rect.width === 0 || el.rect.height === 0) continue;

    if (Math.abs(el.rect.x - currentX) <= tolerance) {
      currentColumn.push(el);
    } else {
      if (currentColumn.length > 1) {
        columns.push(currentColumn);
      }
      currentColumn = [el];
      currentX = el.rect.x;
    }
  }

  if (currentColumn.length > 1) {
    columns.push(currentColumn);
  }

  return columns;
}

/**
 * Calculate gaps between grid items
 */
function calculateGaps(elements: DOMElement[]): {
  horizontal: Map<number, number>;
  vertical: Map<number, number>;
} {
  const horizontalGaps = new Map<number, number>();
  const verticalGaps = new Map<number, number>();

  // Sort by position
  const sorted = [...elements].sort((a, b) => {
    if (Math.abs(a.rect.y - b.rect.y) < 10) {
      return a.rect.x - b.rect.x;
    }
    return a.rect.y - b.rect.y;
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Check if elements are in same row (horizontal gap)
    if (Math.abs(current.rect.y - next.rect.y) < 10) {
      const gap = next.rect.x - (current.rect.x + current.rect.width);
      if (gap > 0) {
        const roundedGap = Math.round(gap);
        horizontalGaps.set(roundedGap, (horizontalGaps.get(roundedGap) || 0) + 1);
      }
    }

    // Check if elements are in same column (vertical gap)
    if (Math.abs(current.rect.x - next.rect.x) < 10) {
      const gap = next.rect.y - (current.rect.y + current.rect.height);
      if (gap > 0) {
        const roundedGap = Math.round(gap);
        verticalGaps.set(roundedGap, (verticalGaps.get(roundedGap) || 0) + 1);
      }
    }
  }

  return { horizontal: horizontalGaps, vertical: verticalGaps };
}
