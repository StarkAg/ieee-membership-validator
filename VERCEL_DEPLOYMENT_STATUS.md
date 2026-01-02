# Vercel Deployment Status Checker

This feature allows you to check the status of your latest Vercel deployment directly from the web app.

## Setup Instructions

### Step 1: Get Your Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click **"Create Token"**
3. Give it a name (e.g., "Deployment Status Checker")
4. Set expiration (or leave as "No expiration")
5. Click **"Create Token"**
6. **Copy the token** (you won't be able to see it again!)

### Step 2: Get Your Project ID

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **General**
4. Find **"Project ID"** and copy it

### Step 3: Get Your Team ID (Optional - only if using a team)

1. In your Vercel Dashboard, if you're using a team:
   - The Team ID is in the URL: `https://vercel.com/teams/YOUR_TEAM_NAME/settings`
   - Or go to Team Settings → General → Team ID

### Step 4: Add Environment Variables to Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

   **Required:**
   - `VERCEL_TOKEN`: Your Vercel API token (from Step 1)
   - `VERCEL_PROJECT_ID`: Your project ID (from Step 2)

   **Optional:**
   - `VERCEL_TEAM_ID`: Your team ID (only if using a team)

4. Make sure to select all environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. Click **"Save"**

### Step 5: Redeploy

After adding the environment variables, you need to redeploy:

1. Go to **Deployments** tab
2. Click the **"⋯"** menu on the latest deployment
3. Click **"Redeploy"**

Or push a new commit to trigger a new deployment.

## Usage

Once set up:

1. Click the **"Check Deploy"** button in the header
2. The status will show:
   - ✅ **Ready** - Deployment is complete and live
   - ⏳ **Building** - Deployment is in progress
   - ❌ **Error** - Deployment failed
   - ⚙️ **Not Configured** - API credentials not set up

## Troubleshooting

**"Not Configured" message:**
- Make sure `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` are set in Vercel environment variables
- Make sure you redeployed after adding the variables

**"Error" message:**
- Check that your Vercel token is valid and hasn't expired
- Verify the Project ID is correct
- If using a team, make sure `VERCEL_TEAM_ID` is set correctly

**Token permissions:**
- The token needs read access to deployments
- Make sure the token has access to the project/team

## Alternative: Manual Check

If you don't want to set up the API, you can always check deployment status manually:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to the **Deployments** tab
4. Check the status of the latest deployment

