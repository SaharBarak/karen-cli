#!/usr/bin/env node

/**
 * Karen CLI Entry Point
 */

import 'dotenv/config';
import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import { AuditEngine } from './core/audit-engine.js';
import { defaultConfig } from './types/config.js';
import type { KarenConfig } from './types/config.js';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

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
  .action(async (url: string, options) => {
    const spinner = ora('Karen is getting ready to judge your CSS...').start();

    try {
      // Load config
      let config: KarenConfig = { ...defaultConfig };

      if (options.config) {
        const configPath = path.resolve(process.cwd(), options.config);
        try {
          const configModule = await import(configPath);
          config = { ...config, ...configModule.default };
        } catch (error) {
          spinner.warn('Could not load config file, using defaults');
        }
      }

      // Override with CLI options
      if (options.apiKey) {
        config.anthropicApiKey = options.apiKey;
      } else if (process.env.ANTHROPIC_API_KEY) {
        config.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      }

      if (options.noAi) {
        delete config.anthropicApiKey;
      }

      if (options.output) {
        config.outputDir = path.dirname(options.output);
      }

      spinner.text = `Auditing ${pc.cyan(url)}...`;

      // Run audit
      const engine = new AuditEngine(config);
      const result = await engine.runAudit(url);

      if (result.isErr()) {
        spinner.fail(pc.red(`Audit failed: ${result.error.message}`));
        console.error(pc.red(result.error.stack || ''));
        process.exit(1);
      }

      const auditResult = result.value;

      // Create output directory
      await fs.mkdir(config.outputDir, { recursive: true });

      // Save JSON output
      const jsonPath = path.resolve(process.cwd(), options.output);
      await fs.writeFile(jsonPath, JSON.stringify(auditResult, null, 2), 'utf-8');

      // Save Markdown output
      if (options.markdown) {
        const mdPath = path.resolve(process.cwd(), options.markdown);
        const markdown = generateMarkdownReport(auditResult);
        await fs.writeFile(mdPath, markdown, 'utf-8');
      }

      spinner.succeed(pc.green('Audit complete!'));

      // Display summary
      console.log('\n' + pc.bold('Karen\'s Verdict:'));
      console.log(pc.gray('━'.repeat(50)));

      const { summary } = auditResult;

      if (summary.total === 0) {
        console.log(pc.green('✨ Wow, Karen is actually impressed. No issues found!'));
      } else {
        console.log(`Total Issues: ${pc.yellow(summary.total.toString())}`);
        if (summary.critical > 0)
          console.log(`  ${pc.red('🚨 Critical')}: ${summary.critical}`);
        if (summary.high > 0) console.log(`  ${pc.red('⚠️  High')}: ${summary.high}`);
        if (summary.medium > 0)
          console.log(`  ${pc.yellow('📋 Medium')}: ${summary.medium}`);
        if (summary.low > 0) console.log(`  ${pc.blue('ℹ️  Low')}: ${summary.low}`);

        console.log('\n' + pc.bold('Issues by Type:'));
        Object.entries(summary.byType).forEach(([type, count]) => {
          if (count > 0) {
            console.log(`  ${type}: ${count}`);
          }
        });
      }

      console.log(pc.gray('━'.repeat(50)));
      console.log(`\n${pc.cyan('📄 Full report:')} ${jsonPath}`);
      if (options.markdown) {
        console.log(`${pc.cyan('📝 Markdown report:')} ${options.markdown}`);
      }

      // Create PR if requested
      if (options.createPr) {
        const { createFixPR } = await import('./core/github-fixer.js');
        const prSpinner = ora('Creating GitHub PR with fixes...').start();

        const prResult = await createFixPR(auditResult, {
          repoUrl: options.githubRepo,
          branchName: options.branch,
        });

        if (prResult.isErr()) {
          prSpinner.fail(pc.red(`Failed to create PR: ${prResult.error}`));
        } else {
          const pr = prResult.value;
          prSpinner.succeed(pc.green('PR created successfully!'));
          console.log(pc.gray('━'.repeat(50)));
          console.log(`${pc.cyan('🎯 Pull Request:')} ${pr.prUrl}`);
          console.log(`${pc.cyan('   PR Number:')} #${pr.prNumber}`);
          console.log(`${pc.cyan('   Files Changed:')} ${pr.filesChanged}`);
          console.log(`${pc.cyan('   Issues Fixed:')} ${pr.issuesFixed}`);
          console.log(pc.gray('━'.repeat(50)));
        }
      }

      // Exit with appropriate code
      if (config.failOn.includes('critical') && summary.critical > 0) {
        process.exit(2);
      }
      if (config.failOn.includes('high') && summary.high > 0) {
        process.exit(3);
      }
    } catch (error) {
      spinner.fail(pc.red('Unexpected error'));
      console.error(error);
      process.exit(10);
    }
  });

function generateMarkdownReport(result: any): string {
  let md = `# Karen's Layout Audit Report\n\n`;
  md += `**Site:** ${result.meta.siteUrl}  \n`;
  md += `**Date:** ${new Date(result.meta.auditDate).toLocaleString()}  \n`;
  md += `**Total Issues:** ${result.summary.total} `;
  md += `(${result.summary.critical} critical, ${result.summary.high} high, ${result.summary.medium} medium, ${result.summary.low} low)\n\n`;
  md += `---\n\n`;

  const criticalIssues = result.issues.filter((i: any) => i.severity === 'critical');
  const highIssues = result.issues.filter((i: any) => i.severity === 'high');
  const mediumIssues = result.issues.filter((i: any) => i.severity === 'medium');
  const lowIssues = result.issues.filter((i: any) => i.severity === 'low');

  if (criticalIssues.length > 0) {
    md += `## 🚨 Critical Issues\n\n`;
    criticalIssues.forEach((issue: any) => {
      md += formatIssue(issue);
    });
  }

  if (highIssues.length > 0) {
    md += `## ⚠️ High Priority\n\n`;
    highIssues.forEach((issue: any) => {
      md += formatIssue(issue);
    });
  }

  if (mediumIssues.length > 0) {
    md += `## 📋 Medium Priority\n\n`;
    mediumIssues.forEach((issue: any) => {
      md += formatIssue(issue);
    });
  }

  if (lowIssues.length > 0) {
    md += `## ℹ️ Low Priority\n\n`;
    lowIssues.forEach((issue: any) => {
      md += formatIssue(issue);
    });
  }

  md += `\n---\n\n`;
  md += `✨ This report was generated by Karen CLI\n`;

  return md;
}

function formatIssue(issue: any): string {
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
