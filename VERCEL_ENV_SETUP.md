# Setting Up Environment Variables in Vercel

This guide will walk you through setting up the environment variables needed for automatic cookie refresh.

## Step 1: Create a GitHub Personal Access Token

1. **Go to GitHub Settings**
   - Click your profile picture (top right) → **Settings**
   - Or go directly to: https://github.com/settings/profile

2. **Navigate to Developer Settings**
   - Scroll down in the left sidebar
   - Click **Developer settings** (at the bottom)

3. **Go to Personal Access Tokens**
   - Click **Personal access tokens**
   - Click **Tokens (classic)** (not "Fine-grained tokens")

4. **Generate New Token**
   - Click **Generate new token** → **Generate new token (classic)**
   - You may need to enter your password or use 2FA

5. **Configure the Token**
   - **Note**: Give it a name like "IEEE Validator Workflow Token"
   - **Expiration**: Choose your preference (90 days, 1 year, or no expiration)
   - **Select scopes**: Check the box for **`workflow`** (this allows triggering GitHub Actions workflows)
   - Scroll down and click **Generate token**

6. **Copy the Token**
   - ⚠️ **IMPORTANT**: Copy the token immediately - you won't be able to see it again!
   - It will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Save it somewhere safe temporarily

## Step 2: Add Environment Variables in Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Find and click on your **ieee-membership-validator** project

3. **Go to Settings**
   - Click the **Settings** tab at the top

4. **Navigate to Environment Variables**
   - In the left sidebar, click **Environment Variables**

5. **Add GITHUB_TOKEN**
   - Click **Add New**
   - **Key**: `GITHUB_TOKEN`
   - **Value**: Paste the GitHub token you copied (starts with `ghp_`)
   - **Environment**: Select all environments (Production, Preview, Development)
   - Click **Save**

6. **Add GITHUB_REPO**
   - Click **Add New** again
   - **Key**: `GITHUB_REPO`
   - **Value**: `StarkAg/ieee-membership-validator`
   - **Environment**: Select all environments (Production, Preview, Development)
   - Click **Save**

## Step 3: Redeploy Your Application

After adding the environment variables, you need to redeploy:

1. **Go to Deployments tab**
   - Click the **Deployments** tab in your Vercel project

2. **Redeploy**
   - Find your latest deployment
   - Click the **⋯** (three dots) menu
   - Click **Redeploy**
   - Or push a new commit to trigger a new deployment

## Verification

To verify it's working:

1. Try validating some IEEE numbers
2. If you get a 401 error, check the Vercel function logs
3. You should see: `✅ Cookie refresh workflow triggered successfully`
4. Check your GitHub Actions tab - you should see a new workflow run triggered

## Troubleshooting

### Check if Environment Variables are Set

**Use the diagnostic endpoint:**
1. Visit: `https://your-app.vercel.app/api/check-env`
2. This will show you:
   - Whether `GITHUB_TOKEN` is set
   - Whether `GITHUB_REPO` is set
   - If the format is correct
   - What might be missing

**Common Issues:**

**"GITHUB_TOKEN or GITHUB_REPO not configured" error:**
1. ✅ **Verify in Vercel Dashboard:**
   - Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
   - Make sure both `GITHUB_TOKEN` and `GITHUB_REPO` are listed
   - Check that they're enabled for the correct environment (Production/Preview/Development)

2. ✅ **Check for typos:**
   - `GITHUB_TOKEN` (not `GITHUB_TOKEN_` or `GIT_TOKEN`)
   - `GITHUB_REPO` (not `GITHUB_REPOSITORY` or `REPO`)

3. ✅ **Redeploy after adding variables:**
   - Environment variables only apply to NEW deployments
   - Go to Deployments → Click "⋯" → "Redeploy"
   - Or push a new commit to trigger a deployment

4. ✅ **Check Vercel Function Logs:**
   - Go to: Vercel Dashboard → Your Project → Functions
   - Click on a recent function invocation
   - Look for the warning message to see which variable is missing

**Token not working?**
- Make sure the token has the `workflow` scope checked
- Verify the token hasn't expired
- Check that the token has access to the repository
- Token should start with `ghp_`

**Workflow not triggering?**
- Check Vercel function logs for errors
- Verify `GITHUB_REPO` is exactly `StarkAg/ieee-membership-validator` (no extra spaces, no quotes)
- Make sure the workflow file exists at `.github/workflows/refresh-cookie.yml`
- Check GitHub Actions tab to see if workflow was triggered

**Still having issues?**
- Visit `/api/check-env` to see detailed diagnostic information
- Check the Vercel deployment logs
- Verify environment variables are set for the correct environment (Production/Preview/Development)
- Make sure you redeployed after adding the variables
- Try removing and re-adding the environment variables

