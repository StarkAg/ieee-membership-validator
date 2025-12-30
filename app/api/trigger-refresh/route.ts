import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to trigger GitHub Actions workflow for cookie refresh
 * This is called automatically when a 401 error is detected
 */
export async function POST(request: NextRequest) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO; // Format: "owner/repo"
    const workflowId = 'refresh-cookie.yml'; // The workflow file name

    if (!githubToken) {
      console.error('GITHUB_TOKEN environment variable is not set');
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    if (!githubRepo) {
      console.error('GITHUB_REPO environment variable is not set');
      return NextResponse.json(
        { error: 'GitHub repository not configured' },
        { status: 500 }
      );
    }

    // Trigger the workflow using GitHub API
    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Invalid GITHUB_REPO format. Expected: owner/repo' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main', // Branch to run the workflow on
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return NextResponse.json(
        {
          error: `Failed to trigger workflow: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cookie refresh workflow triggered successfully',
    });
  } catch (error: any) {
    console.error('Error triggering workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger workflow' },
      { status: 500 }
    );
  }
}

