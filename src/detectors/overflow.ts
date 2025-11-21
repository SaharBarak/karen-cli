/**
 * Overflow Detection
 */

import type { ViewportSnapshot, Issue } from '../types/audit.js';
import type { KarenConfig } from '../types/config.js';
import { generateId } from '../utils/id.js';

export function detectOverflow(
  snapshots: ViewportSnapshot[],
  _config: KarenConfig
): Issue[] {
  const issues: Issue[] = [];

  for (const snapshot of snapshots) {
    for (const element of snapshot.dom) {
      // Check if element has overflow issues
      const overflow = element.computedStyle.overflow || 'visible';
      const overflowX = element.computedStyle.overflowX || overflow;

      // Check for horizontal overflow
      if (
        overflowX === 'visible' &&
        snapshot.metrics.overflowingElements > 0 &&
        element.rect.width > 0
      ) {
        const roastMessages = [
          `Sweetie, your ${element.tagName} is literally breaking its container on ${snapshot.viewport.name}.`,
          `Horizontal overflow on ${snapshot.viewport.name}? Karen's not impressed with your CSS skills.`,
          `Your ${element.tagName} thinks it's bigger than its container. Spoiler: it's not.`,
          `Overflow issues? Really? Karen thought we left this in 2010.`,
        ];

        issues.push({
          id: generateId('OVF'),
          type: 'overflow',
          severity: 'high',
          viewport: snapshot.viewport.name,
          element: element.selector,
          message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
          details: {
            overflow: 'horizontal',
            elementWidth: element.rect.width,
            overflowType: overflowX,
            viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`,
          },
          screenshot: snapshot.screenshot,
          fix: {
            suggestion: 'Add max-width: 100% or use clamp() for responsive sizing',
            code: {
              file: 'styles/layout.css',
              before: `${element.selector} {\n  /* current styles */\n}`,
              after: `${element.selector} {\n  max-width: 100%;\n  overflow-x: auto;\n}`,
              explanation:
                'Constrains the element to its container width and adds horizontal scrolling if needed',
            },
          },
        });
      }
    }
  }

  return issues;
}
