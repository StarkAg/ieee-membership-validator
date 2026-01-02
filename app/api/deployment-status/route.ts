import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to check Vercel deployment status
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID environment variables
 */
export async function GET(request: NextRequest) {
  try {
    const vercelToken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID; // Optional

    if (!vercelToken || !projectId) {
      return NextResponse.json({
        available: false,
        message: 'Vercel API credentials not configured',
        instructions: 'Add VERCEL_TOKEN and VERCEL_PROJECT_ID to Vercel environment variables to enable deployment status checking.',
      });
    }

    // Get latest deployment from Vercel API
    const apiUrl = teamId
      ? `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=1`
      : `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        available: false,
        message: 'Failed to fetch deployment status',
        error: errorText,
      }, { status: response.status });
    }

    const data = await response.json();
    const deployments = data.deployments || [];

    if (deployments.length === 0) {
      return NextResponse.json({
        available: false,
        message: 'No deployments found',
      });
    }

    const latestDeployment = deployments[0];

    return NextResponse.json({
      available: true,
      deployment: {
        id: latestDeployment.uid,
        url: latestDeployment.url,
        state: latestDeployment.state, // 'READY', 'BUILDING', 'ERROR', 'QUEUED', 'CANCELED'
        createdAt: latestDeployment.createdAt,
        readyAt: latestDeployment.readyAt,
        buildingAt: latestDeployment.buildingAt,
      },
      isReady: latestDeployment.state === 'READY',
      isBuilding: latestDeployment.state === 'BUILDING' || latestDeployment.state === 'QUEUED',
      isError: latestDeployment.state === 'ERROR' || latestDeployment.state === 'CANCELED',
    });
  } catch (error: any) {
    console.error('Error checking deployment status:', error);
    return NextResponse.json({
      available: false,
      message: 'Error checking deployment status',
      error: error.message,
    }, { status: 500 });
  }
}

