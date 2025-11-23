"use strict";
/**
 * GitHub PR Auto-Fixer (CLI Version - 100% Client-Side)
 * Uses GitHub CLI (gh) for authentication and native git for operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFixPR = createFixPR;
const simple_git_1 = __importDefault(require("simple-git"));
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const result_js_1 = require("./result.js");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Main function to create a PR with CSS fixes
 * Uses gh CLI and native git - no manual token handling
 */
async function createFixPR(auditResult, options = {}) {
    let tempDir = null;
    try {
        // Check if gh CLI is installed and authenticated
        const authCheck = await checkGitHubAuth();
        if (!authCheck.success) {
            return (0, result_js_1.err)(authCheck.error);
        }
        // Auto-detect repo from current directory if not provided
        let repoUrl = options.repoUrl;
        if (!repoUrl) {
            const detectedRepo = await detectCurrentRepo();
            if (detectedRepo) {
                repoUrl = detectedRepo;
                console.log(`✓ Auto-detected repository: ${repoUrl}`);
            }
            else {
                return (0, result_js_1.err)('Could not auto-detect GitHub repository. Please run this command from within a git repository or provide --github-repo flag.');
            }
        }
        // Parse GitHub repo URL
        const repoInfo = parseRepoUrl(repoUrl);
        if (!repoInfo) {
            return (0, result_js_1.err)('Invalid GitHub repository URL. Expected format: https://github.com/owner/repo');
        }
        // Create temporary directory for cloning
        tempDir = await fs_1.promises.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'karen-fixes-'));
        const git = (0, simple_git_1.default)();
        console.log('🔄 Cloning repository locally...');
        // Clone using native git (will use SSH keys or credential manager automatically)
        const cloneUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`;
        await git.clone(cloneUrl, tempDir);
        // Change to temp directory
        const gitInTemp = (0, simple_git_1.default)(tempDir);
        // Checkout base branch
        const baseBranch = options.baseBranch || 'main';
        try {
            await gitInTemp.checkout(baseBranch);
        }
        catch {
            // Try 'master' if 'main' doesn't exist
            try {
                await gitInTemp.checkout('master');
            }
            catch {
                return (0, result_js_1.err)('Could not find default branch (tried "main" and "master")');
            }
        }
        // Create fix branch
        const branchName = options.branchName || `karen-fixes-${Date.now()}`;
        await gitInTemp.checkoutLocalBranch(branchName);
        // Apply fixes from issues
        console.log('🔧 Applying fixes locally...');
        const filesChanged = await applyFixes(tempDir, auditResult.issues);
        if (filesChanged === 0) {
            await cleanup(tempDir);
            return (0, result_js_1.err)('No fixable issues found. All issues may require manual intervention.');
        }
        // Commit changes
        console.log('💾 Committing changes...');
        await gitInTemp.add('.');
        await gitInTemp.commit(generateCommitMessage(auditResult));
        // Push to remote using native git (uses user's credentials)
        console.log('📤 Pushing to GitHub...');
        await gitInTemp.push('origin', branchName, ['--set-upstream']);
        // Create PR using gh CLI
        console.log('🎯 Creating pull request...');
        const prTitle = generatePRTitle(auditResult);
        const prBody = generatePRDescription(auditResult);
        // Save PR body to temp file (gh CLI reads from stdin or file)
        const prBodyFile = path_1.default.join(tempDir, 'pr-body.md');
        await fs_1.promises.writeFile(prBodyFile, prBody, 'utf-8');
        // Create PR using gh CLI
        const { stdout } = await execAsync(`gh pr create --repo "${repoInfo.owner}/${repoInfo.repo}" --base "${baseBranch}" --head "${branchName}" --title "${prTitle}" --body-file "${prBodyFile}"`, { cwd: tempDir });
        // Parse PR URL from gh CLI output (last line is the URL)
        const prUrl = stdout.trim().split('\n').pop() || '';
        const prNumber = parseInt(prUrl.split('/').pop() || '0', 10);
        // Cleanup local temp directory
        await cleanup(tempDir);
        return (0, result_js_1.ok)({
            prUrl,
            prNumber,
            filesChanged,
            issuesFixed: auditResult.issues.filter((i) => i.fix).length,
        });
    }
    catch (error) {
        // Cleanup on error
        if (tempDir)
            await cleanup(tempDir);
        return (0, result_js_1.err)(`Failed to create PR: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Check if GitHub CLI is installed and user is authenticated
 */
async function checkGitHubAuth() {
    try {
        // Check if gh is installed
        await execAsync('gh --version');
    }
    catch {
        return {
            success: false,
            error: 'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/ and run "gh auth login"',
        };
    }
    try {
        // Check if user is authenticated
        await execAsync('gh auth status');
        return { success: true, error: '' };
    }
    catch {
        return {
            success: false,
            error: 'Not authenticated with GitHub. Run "gh auth login" first.',
        };
    }
}
/**
 * Auto-detect current repository from git remote
 */
async function detectCurrentRepo() {
    try {
        const git = (0, simple_git_1.default)();
        const remotes = await git.getRemotes(true);
        const origin = remotes.find((r) => r.name === 'origin');
        if (!origin || !origin.refs.fetch) {
            return null;
        }
        // Extract GitHub URL from remote
        const url = origin.refs.fetch;
        const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
        if (!match)
            return null;
        return `https://github.com/${match[1]}/${match[2]}`;
    }
    catch {
        return null;
    }
}
/**
 * Parse GitHub repository URL
 */
function parseRepoUrl(url) {
    const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!match)
        return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}
/**
 * Apply CSS fixes to files locally on user's machine
 */
async function applyFixes(repoPath, issues) {
    const filesModified = new Set();
    const fixableIssues = issues.filter((issue) => issue.fix && issue.fix.code);
    for (const issue of fixableIssues) {
        if (!issue.fix || !issue.fix.code || !issue.fix.code.file)
            continue;
        const filePath = path_1.default.join(repoPath, issue.fix.code.file);
        try {
            // Check if file exists
            let fileExists = true;
            try {
                await fs_1.promises.access(filePath);
            }
            catch {
                fileExists = false;
            }
            if (!fileExists) {
                // File doesn't exist, create it
                await fs_1.promises.mkdir(path_1.default.dirname(filePath), { recursive: true });
                await fs_1.promises.writeFile(filePath, issue.fix.code.after || '', 'utf-8');
                filesModified.add(issue.fix.code.file);
                continue;
            }
            // Read existing file
            let content = await fs_1.promises.readFile(filePath, 'utf-8');
            // Apply fix
            if (issue.fix.code.before && issue.fix.code.after) {
                // Replace old code with new code
                const replaced = content.replace(issue.fix.code.before, issue.fix.code.after);
                if (replaced !== content) {
                    content = replaced;
                }
                else {
                    // If exact match not found, append
                    content += '\n\n' + issue.fix.code.after;
                }
            }
            else if (issue.fix.code.after) {
                // Append new code
                content += '\n\n' + issue.fix.code.after;
            }
            // Write updated content
            await fs_1.promises.writeFile(filePath, content, 'utf-8');
            filesModified.add(issue.fix.code.file);
        }
        catch (error) {
            console.warn(`⚠️  Failed to apply fix to ${issue.fix.code.file}:`, error);
        }
    }
    return filesModified.size;
}
/**
 * Cleanup temporary directory
 */
async function cleanup(tempDir) {
    try {
        await fs_1.promises.rm(tempDir, { recursive: true, force: true });
    }
    catch (error) {
        console.warn('⚠️  Failed to cleanup temp directory:', error);
    }
}
/**
 * Generate commit message with Karen's sass
 */
function generateCommitMessage(auditResult) {
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
function generatePRTitle(auditResult) {
    const total = auditResult.summary.total;
    return `💅 Karen's CSS Makeover: Fixed ${total} Layout Issues`;
}
/**
 * Generate PR description with Karen's sass
 */
function generatePRDescription(auditResult) {
    const { summary, issues } = auditResult;
    const fixedIssues = issues.filter((i) => i.fix);
    // Group files changed
    const filesChanged = new Map();
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
        .map((issue) => `
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
`)
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
