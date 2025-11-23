"use strict";
/**
 * Issue Detectors Index
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPerformance = exports.enforceResponsiveDesign = exports.detectMisalignment = exports.enforceDesignTokens = exports.detectDesignSystemChaos = exports.analyzeColors = exports.checkAccessibility = exports.enforceTypescale = exports.analyzeSpacing = exports.detectOverflow = void 0;
var overflow_js_1 = require("./overflow.js");
Object.defineProperty(exports, "detectOverflow", { enumerable: true, get: function () { return overflow_js_1.detectOverflow; } });
var spacing_js_1 = require("./spacing.js");
Object.defineProperty(exports, "analyzeSpacing", { enumerable: true, get: function () { return spacing_js_1.analyzeSpacing; } });
var typescale_js_1 = require("./typescale.js");
Object.defineProperty(exports, "enforceTypescale", { enumerable: true, get: function () { return typescale_js_1.enforceTypescale; } });
var accessibility_js_1 = require("./accessibility.js");
Object.defineProperty(exports, "checkAccessibility", { enumerable: true, get: function () { return accessibility_js_1.checkAccessibility; } });
var colors_js_1 = require("./colors.js");
Object.defineProperty(exports, "analyzeColors", { enumerable: true, get: function () { return colors_js_1.analyzeColors; } });
var design_system_js_1 = require("./design-system.js");
Object.defineProperty(exports, "detectDesignSystemChaos", { enumerable: true, get: function () { return design_system_js_1.detectDesignSystemChaos; } });
var design_tokens_js_1 = require("./design-tokens.js");
Object.defineProperty(exports, "enforceDesignTokens", { enumerable: true, get: function () { return design_tokens_js_1.enforceDesignTokens; } });
var alignment_js_1 = require("./alignment.js");
Object.defineProperty(exports, "detectMisalignment", { enumerable: true, get: function () { return alignment_js_1.detectMisalignment; } });
var responsive_js_1 = require("./responsive.js");
Object.defineProperty(exports, "enforceResponsiveDesign", { enumerable: true, get: function () { return responsive_js_1.enforceResponsiveDesign; } });
var performance_js_1 = require("./performance.js");
Object.defineProperty(exports, "detectPerformance", { enumerable: true, get: function () { return performance_js_1.detectPerformance; } });
