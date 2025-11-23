"use strict";
/**
 * Typescale Enforcement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTypescale = enforceTypescale;
const id_js_1 = require("../utils/id.js");
function findNearest(value, scale) {
    return scale.reduce((prev, curr) => Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);
}
function enforceTypescale(snapshots, config) {
    const issues = [];
    const typescale = config.typescale.sizes;
    const textTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'DIV', 'A', 'LI'];
    for (const snapshot of snapshots) {
        const textElements = snapshot.dom.filter((el) => textTags.includes(el.tagName));
        for (const element of textElements) {
            const fontSizeStr = element.computedStyle.fontSize || '16px';
            const fontSize = parseFloat(fontSizeStr);
            if (!typescale.includes(fontSize) && fontSize > 0) {
                const nearest = findNearest(fontSize, typescale);
                const roastMessages = [
                    `Font sizes all over the place? Karen enforces hierarchy like it's the law on ${snapshot.viewport.name}.`,
                    `${fontSize}px font-size? Not in Karen's typescale, sweetie. Try ${nearest}px.`,
                    `Random font sizes make Karen's eye twitch. Use ${nearest}px from your typescale on ${snapshot.viewport.name}.`,
                    `Typography chaos detected at ${fontSize}px. Karen demands ${nearest}px on ${snapshot.viewport.name}.`,
                ];
                issues.push({
                    id: (0, id_js_1.generateId)('TYP'),
                    type: 'typescale',
                    severity: 'medium',
                    viewport: snapshot.viewport.name,
                    element: element.selector,
                    message: roastMessages[Math.floor(Math.random() * roastMessages.length)],
                    details: {
                        fontSize,
                        nearestScaleValue: nearest,
                        typescale,
                        difference: Math.abs(fontSize - nearest),
                    },
                    fix: {
                        suggestion: `Use ${nearest}px from your type scale`,
                        code: {
                            file: 'styles/typography.css',
                            before: `${element.selector} {\n  font-size: ${fontSize}px;\n}`,
                            after: `${element.selector} {\n  font-size: ${nearest}px;\n}`,
                            explanation: `Aligns to the defined typescale with ratio ${config.typescale.ratio}`,
                        },
                    },
                });
            }
        }
    }
    return issues;
}
