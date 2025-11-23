"use strict";
/**
 * Claude AI Integration for Visual Analysis
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeAnalyzer = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const result_js_1 = require("./result.js");
const id_js_1 = require("../utils/id.js");
class ClaudeAnalyzer {
    constructor(apiKey) {
        this.client = new sdk_1.default({ apiKey });
    }
    async analyzeVisualIssues(screenshot, viewport) {
        const prompt = this.buildVisualAnalysisPrompt(viewport);
        return (0, result_js_1.resultify)(async () => {
            const response = await this.client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2048,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: 'image/png',
                                    data: screenshot,
                                },
                            },
                            {
                                type: 'text',
                                text: prompt,
                            },
                        ],
                    },
                ],
            });
            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response format from Claude');
            }
            // Parse JSON response (with error handling)
            let aiResponse;
            try {
                // Try to extract JSON if wrapped in markdown code blocks
                const text = content.text.trim();
                const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
                const jsonText = jsonMatch ? jsonMatch[1] : text;
                aiResponse = JSON.parse(jsonText);
            }
            catch (parseError) {
                console.error('Failed to parse Claude AI response:', content.text);
                throw new Error('Invalid JSON response from Claude AI');
            }
            // Validate response structure
            if (!aiResponse.issues || !Array.isArray(aiResponse.issues)) {
                console.warn('Claude AI response missing issues array:', aiResponse);
                return [];
            }
            return aiResponse.issues.map((issue) => ({
                id: (0, id_js_1.generateId)('AI'),
                type: issue.type || 'overflow',
                severity: issue.severity || 'medium',
                viewport: viewport.name,
                element: issue.location || 'Unknown',
                message: issue.roast || issue.description,
                details: {
                    aiDetected: true,
                    description: issue.description,
                    visualIssue: true,
                },
                screenshot,
            }));
        }, (error) => result_js_1.KarenError.aiError('Failed to analyze visual issues with Claude', error));
    }
    async generateFix(issue, context) {
        const prompt = this.buildFixGenerationPrompt(issue, context);
        return (0, result_js_1.resultify)(async () => {
            const response = await this.client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });
            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response format from Claude');
            }
            return JSON.parse(content.text).fix;
        }, (error) => result_js_1.KarenError.aiError('Failed to generate fix with Claude', error));
    }
    buildVisualAnalysisPrompt(viewport) {
        return `You are Karen, a sassy CSS layout auditor. Analyze this webpage screenshot at ${viewport.name} (${viewport.width}x${viewport.height}).

Look for:
1. Visual overflow or clipping
2. Misaligned elements
3. Awkward spacing or layout breaks
4. Text that's too long or poorly wrapped
5. Images that are stretched or distorted
6. Broken grid/flex layouts

IMPORTANT: Respond ONLY with valid JSON. No other text before or after.

For each issue found, use this exact JSON structure:
{
  "issues": [
    {
      "type": "overflow",
      "severity": "high",
      "description": "Brief technical description",
      "location": "Describe where in the viewport (e.g., 'top navigation', 'hero section')",
      "roast": "Your sassy Karen-style roast message"
    }
  ]
}

Valid types: "overflow", "spacing", "typescale", "colors", "accessibility", "design-system"
Valid severities: "critical", "high", "medium", "low"

Be specific about locations using visual landmarks. If no issues are found, return exactly: {"issues": []}`;
    }
    buildFixGenerationPrompt(issue, context) {
        return `You are Karen, a CSS layout expert. Fix this issue:

**Issue:** ${issue.message}
**Type:** ${issue.type}
**Element:** ${issue.element}
**Details:** ${JSON.stringify(issue.details)}

**Current Code:**
\`\`\`css
${context.currentStyles}
\`\`\`

**HTML Context:**
\`\`\`html
${context.htmlSnippet}
\`\`\`

Generate a clean, minimal CSS fix. Respond with:
{
  "fix": {
    "file": "path/to/file.css",
    "changes": [
      {
        "selector": ".class-name",
        "before": "property: value;",
        "after": "property: new-value;",
        "explanation": "Why this fixes the issue"
      }
    ]
  }
}

Rules:
- Use modern CSS (clamp, min/max, CSS variables)
- Maintain responsive behavior
- Don't break other layouts
- Follow best practices`;
    }
}
exports.ClaudeAnalyzer = ClaudeAnalyzer;
