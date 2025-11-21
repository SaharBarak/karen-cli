/**
 * GitHub PR Auto-Fixer (CLI Version - 100% Client-Side)
 * Runs entirely on the user's machine with their GitHub token
 */

import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { Issue, AuditResult } from '../types/audit.js';
import { Result, ok, err } from './result.js';

export interface GitHubFixerOptions {
  repoUrl: string;
  githubToken: string;
  branchName?: string;
  baseBranch?: string;
}

export interface PRResult {
  prUrl: string;
  prNumber: number;
  filesChanged: number;
  issuesFixed: number;
}

/**
 * Main function to create a PR with CSS fixes
 * CLIENT-SIDE ONLY: Clones repo locally, applies fixes, pushes from user's machine
 */
export async function createFixPR(
  auditResult: AuditResult,
  options: GitHubFixerOptions
): Promise<Result<PRResult, string>> {
  let tempDir: string | null = null;

  try {
    // Parse GitHub repo URL
    const repoInfo = parseRepoUrl(options.repoUrl);
    if (!repoInfo) {
      return err('Invalid GitHub repository URL. Expected format: https://github.com/owner/repo');
    }

    // Initialize Octokit
    const octokit = new Octokit({ auth: options.githubToken });

    // Create temporary directory for cloning (on user's machine)
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'karen-fixes-'));
    const git: SimpleGit = simpleGit(tempDir);

    console.log('🔄 Cloning repository to your machine...');

    // Clone using token for authentication
    const cloneUrl = `https://${options.githubToken}@github.com/${repoInfo.owner}/${repoInfo.repo}.git`;
    await git.clone(cloneUrl, tempDir);
    await git.cwd(tempDir);

    // Configure git user (use GitHub API to get user info)
    const { data: user } = await octokit.users.getAuthenticated();
    await git.addConfig('user.name', user.name || user.login);
    await git.addConfig('user.email', user.email || `${user.login}@users.noreply.github.com`);

    // Checkout base branch
    const baseBranch = options.baseBranch || 'main';
    try {
      await git.checkout(baseBranch);
    } catch {
      // Try 'master' if 'main' doesn't exist
      await git.checkout('master');
    }

    // Create fix branch
    const branchName = options.branchName || `karen-fixes-${Date.now()}`;
    await git.checkoutLocalBranch(branchName);

    // Apply fixes from issues (on user's local machine)
    console.log('🔧 Applying fixes locally...');
    const filesChanged = await applyFixes(tempDir, auditResult.issues);

    if (filesChanged === 0) {
      await cleanup(tempDir);
      return err('No fixable issues found. All issues may require manual intervention.');
    }

    // Commit changes locally
    console.log('💾 Committing changes...');
    await git.add('.');
    await git.commit(generateCommitMessage(auditResult));

    // Push to remote (from user's machine)
    console.log('📤 Pushing to GitHub from your machine...');
    await git.push('origin', branchName, ['--set-upstream']);

    // Create PR via API
    console.log('🎯 Creating pull request...');
    const pr = await octokit.pulls.create({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      title: generatePRTitle(auditResult),
      head: branchName,
      base: baseBranch,
      body: generatePRDescription(auditResult),
    });

    // Cleanup local temp directory
    await cleanup(tempDir);

    return ok({
      prUrl: pr.data.html_url,
      prNumber: pr.data.number,
      filesChanged,
      issuesFixed: auditResult.issues.filter((i) => i.fix).length,
    });
  } catch (error) {
    // Cleanup on error
    if (tempDir) await cleanup(tempDir);
    return err(`Failed to create PR: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse GitHub repository URL
 */
function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/**
 * Apply CSS fixes to files locally on user's machine
 */
async function applyFixes(repoPath: string, issues: Issue[]): Promise<number> {
  const filesModified = new Set<string>();
  const fixableIssues = issues.filter((issue) => issue.fix && issue.fix.code);

  for (const issue of fixableIssues) {
    if (!issue.fix || !issue.fix.code || !issue.fix.code.file) continue;

    const filePath = path.join(repoPath, issue.fix.code.file);

    try {
      // Check if file exists
      let fileExists = true;
      try {
        await fs.access(filePath);
      } catch {
        fileExists = false;
      }

      if (!fileExists) {
        // File doesn't exist, create it
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, issue.fix.code.after || '', 'utf-8');
        filesModified.add(issue.fix.code.file);
        continue;
      }

      // Read existing file
      let content = await fs.readFile(filePath, 'utf-8');

      // Apply fix
      if (issue.fix.code.before && issue.fix.code.after) {
        // Replace old code with new code
        const replaced = content.replace(issue.fix.code.before, issue.fix.code.after);
        if (replaced !== content) {
          content = replaced;
        } else {
          // If exact match not found, append
          content += '\n\n' + issue.fix.code.after;
        }
      } else if (issue.fix.code.after) {
        // Append new code
        content += '\n\n' + issue.fix.code.after;
      }

      // Write updated content
      await fs.writeFile(filePath, content, 'utf-8');
      filesModified.add(issue.fix.code.file);
    } catch (error) {
      console.warn(`⚠️  Failed to apply fix to ${issue.fix.code.file}:`, error);
    }
  }

  return filesModified.size;
}

/**
 * Cleanup temporary directory
 */
async function cleanup(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('⚠️  Failed to cleanup temp directory:', error);
  }
}

/**
 * Generate commit message with Karen's sass
 */
function generateCommitMessage(auditResult: AuditResult): string {
  const total = auditResult.summary.total;
  const high = auditResult.summary.high;
  const critical = auditResult.summary.critical;

  return `fix: Karen's CSS makeover - fixed ${total} layout issues

Applied automatic fixes for ${total} CSS issues detected by Karen CLI.

Critical: ${critical}
High: ${high}
Medium: ${auditResult.summary.medium}
Low: ${auditResult.summary.low}

Issues fixed:
${Object.entries(auditResult.summary.byType || {})
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}`;
}

/**
 * Generate PR title
 */
function generatePRTitle(auditResult: AuditResult): string {
  const total = auditResult.summary.total;
  return `💅 Karen's CSS Makeover: Fixed ${total} Layout Issues`;
}

/**
 * Generate PR description with Karen's sass
 */
function generatePRDescription(auditResult: AuditResult): string {
  const { summary, issues } = auditResult;
  const fixedIssues = issues.filter((i) => i.fix);

  // Group files changed
  const filesChanged = new Map<string, number>();
  fixedIssues.forEach((issue) => {
    if (issue.fix && issue.fix.code && issue.fix.code.file) {
      const file = issue.fix.code.file;
      filesChanged.set(file, (filesChanged.get(file) || 0) + 1);
    }
  });

  return `# 💅 Karen's CSS Makeover

Hi there! Karen here. I audited your site and found **${summary.total} layout issues** that are making your design look like it was created in the MySpace era. I took the liberty of fixing them for you.

## What I Fixed

- ✅ ${summary.high} high priority issues (these were embarrassing)
- ✅ ${summary.medium} medium priority issues (not great, not terrible)
- ✅ ${summary.low} low priority issues (minor nitpicks, but still...)

## Issues by Type

${Object.entries(summary.byType || {})
  .map(([type, count]) => `- **${type}**: ${count} issues`)
  .join('\n')}

## Files Changed

${Array.from(filesChanged.entries())
  .map(([file, count]) => `- \`${file}\` (${count} fixes)`)
  .join('\n')}

## Sample Fixes

${fixedIssues
  .slice(0, 3)
  .map(
    (issue) => `
### ${issue.type}: ${issue.element || 'Multiple elements'}
**Viewport:** ${issue.viewport}
**Severity:** ${issue.severity}

> ${issue.message}

\`\`\`css
/* Before */
${issue.fix?.code?.before || '/* N/A */'}

/* After */
${issue.fix?.code?.after || '/* N/A */'}
\`\`\`
`
  )
  .join('\n---\n')}

${fixedIssues.length > 3 ? `\n...and ${fixedIssues.length - 3} more fixes!\n` : ''}

## Testing Checklist

Before merging, please verify:

- [ ] All fixes render correctly across viewports
- [ ] No regression in existing functionality
- [ ] Design looks better than before (it definitely does)
- [ ] Run your existing tests

## Need Help?

If any fix breaks something (unlikely, but possible), just revert that specific change. Karen's not perfect, but she's pretty darn close.

---

💅 **Generated by [Karen CLI v1.0.0](https://github.com/SaharBarak/KarenCLI)**

Merge this PR and your site will finally look professional. You're welcome.

**Audited:** ${auditResult.meta.siteUrl}
**Date:** ${new Date(auditResult.meta.auditDate).toLocaleDateString()}`;
}
