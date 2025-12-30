import { NextRequest, NextResponse } from 'next/server';

/**
 * Diagnostic endpoint to check if environment variables are configured
 * This helps debug why auto-refresh might not be working
 */
export async function GET(request: NextRequest) {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO;

  // Check if variables exist (but don't expose their values)
  const hasToken = !!githubToken;
  const hasRepo = !!githubRepo;
  const tokenLength = githubToken ? githubToken.length : 0;
  const repoValue = githubRepo || 'NOT SET';

  // Check token format (should start with ghp_)
  const tokenFormatValid = githubToken ? githubToken.startsWith('ghp_') : false;

  // Check repo format (should be owner/repo)
  const repoFormatValid = githubRepo ? /^[^/]+\/[^/]+$/.test(githubRepo) : false;

  return NextResponse.json({
    configured: hasToken && hasRepo,
    details: {
      GITHUB_TOKEN: {
        exists: hasToken,
        length: tokenLength,
        formatValid: tokenFormatValid,
        preview: githubToken ? `${githubToken.substring(0, 7)}...` : 'NOT SET',
      },
      GITHUB_REPO: {
        exists: hasRepo,
        value: repoValue,
        formatValid: repoFormatValid,
      },
    },
    message: hasToken && hasRepo
      ? '✅ Environment variables are configured correctly'
      : '❌ Environment variables are missing or incorrectly configured',
    instructions: !hasToken || !hasRepo
      ? {
          missing: [
            !hasToken && 'GITHUB_TOKEN',
            !hasRepo && 'GITHUB_REPO',
          ].filter(Boolean),
          steps: [
            '1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
            '2. Add GITHUB_TOKEN: Your GitHub Personal Access Token (starts with ghp_)',
            '3. Add GITHUB_REPO: StarkAg/ieee-membership-validator',
            '4. Make sure to select all environments (Production, Preview, Development)',
            '5. Redeploy your application',
          ],
        }
      : null,
  });
}

