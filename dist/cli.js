#!/usr/bin/env node
"use strict";
/**
 * Karen CLI Entry Point
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const commander_1 = require("commander");
const picocolors_1 = __importDefault(require("picocolors"));
const ora_1 = __importDefault(require("ora"));
const audit_engine_js_1 = require("./core/audit-engine.js");
const config_js_1 = require("./types/config.js");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const program = new commander_1.Command();
program
    .name('karen')
    .description('Karen CLI - Sassy CSS Layout Auditor')
    .version('1.0.0');
program
    .command('audit')
    .description('Run a CSS layout audit on a website')
    .argument('<url>', 'URL of the website to audit')
    .option('-o, --output <path>', 'Output file path for JSON results', './karen-tasks.json')
    .option('-m, --markdown <path>', 'Output file path for Markdown report', './KAREN_TASKS.md')
    .option('-c, --config <path>', 'Path to karen.config.js')
    .option('--api-key <key>', 'Anthropic API key for AI-powered analysis')
    .option('--no-ai', 'Disable AI visual analysis')
    .option('--github-repo <url>', 'GitHub repository URL (optional, auto-detects from git remote)')
    .option('--create-pr', 'Automatically create a PR with fixes (requires "gh auth login")')
    .option('--branch <name>', 'Custom branch name for PR (default: karen-fixes-<timestamp>)')
    .action(async (url, options) => {
    const spinner = (0, ora_1.default)('Karen is getting ready to judge your CSS...').start();
    try {
        // Load config
        let config = { ...config_js_1.defaultConfig };
        if (options.config) {
            const configPath = path_1.default.resolve(process.cwd(), options.config);
            try {
                const configModule = await Promise.resolve(`${configPath}`).then(s => __importStar(require(s)));
                config = { ...config, ...configModule.default };
            }
            catch (error) {
                spinner.warn('Could not load config file, using defaults');
            }
        }
        // Override with CLI options
        if (options.apiKey) {
            config.anthropicApiKey = options.apiKey;
        }
        else if (process.env.ANTHROPIC_API_KEY) {
            config.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        }
        if (options.noAi) {
            delete config.anthropicApiKey;
        }
        if (options.output) {
            config.outputDir = path_1.default.dirname(options.output);
        }
        spinner.text = `Auditing ${picocolors_1.default.cyan(url)}...`;
        // Run audit
        const engine = new audit_engine_js_1.AuditEngine(config);
        const result = await engine.runAudit(url);
        if (result.isErr()) {
            spinner.fail(picocolors_1.default.red(`Audit failed: ${result.error.message}`));
            console.error(picocolors_1.default.red(result.error.stack || ''));
            process.exit(1);
        }
        const auditResult = result.value;
        // Create output directory
        await promises_1.default.mkdir(config.outputDir, { recursive: true });
        // Save JSON output
        const jsonPath = path_1.default.resolve(process.cwd(), options.output);
        await promises_1.default.writeFile(jsonPath, JSON.stringify(auditResult, null, 2), 'utf-8');
        // Save Markdown output
        if (options.markdown) {
            const mdPath = path_1.default.resolve(process.cwd(), options.markdown);
            const markdown = generateMarkdownReport(auditResult);
            await promises_1.default.writeFile(mdPath, markdown, 'utf-8');
        }
        spinner.succeed(picocolors_1.default.green('Audit complete!'));
        // Display summary
        console.log('\n' + picocolors_1.default.bold('Karen\'s Verdict:'));
        console.log(picocolors_1.default.gray('━'.repeat(50)));
        const { summary } = auditResult;
        if (summary.total === 0) {
            console.log(picocolors_1.default.green('✨ Wow, Karen is actually impressed. No issues found!'));
        }
        else {
            console.log(`Total Issues: ${picocolors_1.default.yellow(summary.total.toString())}`);
            if (summary.critical > 0)
                console.log(`  ${picocolors_1.default.red('🚨 Critical')}: ${summary.critical}`);
            if (summary.high > 0)
                console.log(`  ${picocolors_1.default.red('⚠️  High')}: ${summary.high}`);
            if (summary.medium > 0)
                console.log(`  ${picocolors_1.default.yellow('📋 Medium')}: ${summary.medium}`);
            if (summary.low > 0)
                console.log(`  ${picocolors_1.default.blue('ℹ️  Low')}: ${summary.low}`);
            console.log('\n' + picocolors_1.default.bold('Issues by Type:'));
            Object.entries(summary.byType).forEach(([type, count]) => {
                if (count > 0) {
                    console.log(`  ${type}: ${count}`);
                }
            });
        }
        console.log(picocolors_1.default.gray('━'.repeat(50)));
        console.log(`\n${picocolors_1.default.cyan('📄 Full report:')} ${jsonPath}`);
        if (options.markdown) {
            console.log(`${picocolors_1.default.cyan('📝 Markdown report:')} ${options.markdown}`);
        }
        // Create PR if requested
        if (options.createPr) {
            const { createFixPR } = await Promise.resolve().then(() => __importStar(require('./core/github-fixer.js')));
            const prSpinner = (0, ora_1.default)('Creating GitHub PR with fixes...').start();
            const prResult = await createFixPR(auditResult, {
                repoUrl: options.githubRepo,
                branchName: options.branch,
            });
            if (prResult.isErr()) {
                prSpinner.fail(picocolors_1.default.red(`Failed to create PR: ${prResult.error}`));
            }
            else {
                const pr = prResult.value;
                prSpinner.succeed(picocolors_1.default.green('PR created successfully!'));
                console.log(picocolors_1.default.gray('━'.repeat(50)));
                console.log(`${picocolors_1.default.cyan('🎯 Pull Request:')} ${pr.prUrl}`);
                console.log(`${picocolors_1.default.cyan('   PR Number:')} #${pr.prNumber}`);
                console.log(`${picocolors_1.default.cyan('   Files Changed:')} ${pr.filesChanged}`);
                console.log(`${picocolors_1.default.cyan('   Issues Fixed:')} ${pr.issuesFixed}`);
                console.log(picocolors_1.default.gray('━'.repeat(50)));
            }
        }
        // Exit with appropriate code
        if (config.failOn.includes('critical') && summary.critical > 0) {
            process.exit(2);
        }
        if (config.failOn.includes('high') && summary.high > 0) {
            process.exit(3);
        }
    }
    catch (error) {
        spinner.fail(picocolors_1.default.red('Unexpected error'));
        console.error(error);
        process.exit(10);
    }
});
function generateMarkdownReport(result) {
    let md = `# Karen's Layout Audit Report\n\n`;
    md += `**Site:** ${result.meta.siteUrl}  \n`;
    md += `**Date:** ${new Date(result.meta.auditDate).toLocaleString()}  \n`;
    md += `**Total Issues:** ${result.summary.total} `;
    md += `(${result.summary.critical} critical, ${result.summary.high} high, ${result.summary.medium} medium, ${result.summary.low} low)\n\n`;
    md += `---\n\n`;
    const criticalIssues = result.issues.filter((i) => i.severity === 'critical');
    const highIssues = result.issues.filter((i) => i.severity === 'high');
    const mediumIssues = result.issues.filter((i) => i.severity === 'medium');
    const lowIssues = result.issues.filter((i) => i.severity === 'low');
    if (criticalIssues.length > 0) {
        md += `## 🚨 Critical Issues\n\n`;
        criticalIssues.forEach((issue) => {
            md += formatIssue(issue);
        });
    }
    if (highIssues.length > 0) {
        md += `## ⚠️ High Priority\n\n`;
        highIssues.forEach((issue) => {
            md += formatIssue(issue);
        });
    }
    if (mediumIssues.length > 0) {
        md += `## 📋 Medium Priority\n\n`;
        mediumIssues.forEach((issue) => {
            md += formatIssue(issue);
        });
    }
    if (lowIssues.length > 0) {
        md += `## ℹ️ Low Priority\n\n`;
        lowIssues.forEach((issue) => {
            md += formatIssue(issue);
        });
    }
    md += `\n---\n\n`;
    md += `✨ This report was generated by Karen CLI\n`;
    return md;
}
function formatIssue(issue) {
    let md = `### ${issue.id}: ${issue.type}\n\n`;
    md += `**Viewport:** ${issue.viewport}  \n`;
    md += `**Element:** \`${issue.element}\`\n\n`;
    md += `> ${issue.message}\n\n`;
    if (issue.fix?.suggestion) {
        md += `**Fix:** ${issue.fix.suggestion}\n\n`;
    }
    if (issue.fix?.code) {
        md += `\`\`\`css\n/* Before */\n${issue.fix.code.before}\n\n/* After */\n${issue.fix.code.after}\n\`\`\`\n\n`;
    }
    md += `---\n\n`;
    return md;
}
program.parse();
