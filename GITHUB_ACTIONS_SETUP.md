# GitHub Actions Cookie Refresh Setup

## ✅ What This Does

Automatically refreshes your IEEE cookie every 6 hours using GitHub Actions (FREE) and updates your Vercel deployment.

**Benefits:**
- ✅ **100% Free** - GitHub Actions free tier includes 2000 minutes/month
- ✅ **No Mac Required** - Runs in the cloud
- ✅ **Automatic** - Runs every 6 hours
- ✅ **Auto-Deploys** - Updates Vercel automatically

## 📋 Setup Instructions

### Step 1: Add GitHub Secrets

1. Go to your GitHub repository: https://github.com/StarkAg/ieee-membership-validator
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

   **Secret 1:**
   - Name: `IEEE_USERNAME`
   - Value: `ha1487@srmist.edu.in`

   **Secret 2:**
   - Name: `IEEE_PASSWORD`
   - Value: `Harsh@954`

### Step 2: Push the Workflow File

The workflow file is already created at `.github/workflows/refresh-cookie.yml`. Just commit and push:

```bash
cd "/Users/mrstark/Desktop/Code PlayGround/IEEE_Membership_Validater/web-app"
git add .github/workflows/refresh-cookie.yml
git commit -m "Add GitHub Actions cookie refresh workflow"
git push starkag main
```

### Step 3: Test It

1. Go to your GitHub repo → **Actions** tab
2. You'll see "Refresh IEEE Cookie" workflow
3. Click **Run workflow** → **Run workflow** (to test manually)
4. Watch it run and check if it updates the cookie

### Step 4: Remove Mac Cron Job (Optional)

Since GitHub Actions handles it now, you can remove the Mac cron:

```bash
crontab -e
# Remove or comment out the line:
# 0 */6 * * * /Users/mrstark/Desktop/Code\ PlayGround/IEEE_Membership_Validater/refresh_cookie_cron.sh
```

## 🕐 Schedule

The workflow runs automatically:
- **Every 6 hours** (12:00 AM, 6:00 AM, 12:00 PM, 6:00 PM UTC)
- You can also trigger it manually from GitHub Actions tab

## 📊 Monitoring

- Check workflow runs: https://github.com/StarkAg/ieee-membership-validator/actions
- Check Vercel deployments: Your Vercel dashboard
- Check cookie updates: Look at `app/page.tsx` commits

## ⚠️ Important Notes

1. **GitHub Secrets**: Never commit credentials to the repo
2. **Free Tier Limits**: 2000 minutes/month (plenty for 6-hour schedule)
3. **Vercel Auto-Deploy**: Each commit triggers a new Vercel deployment
4. **Cookie Updates**: The cookie in `app/page.tsx` gets updated automatically

## 🔧 Troubleshooting

**Workflow fails?**
- Check GitHub Actions logs
- Verify secrets are set correctly
- Check if IEEE login page changed

**Cookie not updating?**
- Check if workflow ran successfully
- Verify `app/page.tsx` was committed
- Check Vercel deployment logs

**Want to change schedule?**
- Edit `.github/workflows/refresh-cookie.yml`
- Change the cron: `'0 */6 * * *'` (format: minute hour day month weekday)
- Examples:
  - `'0 */4 * * *'` = every 4 hours
  - `'0 0 * * *'` = once daily at midnight
  - `'0 */12 * * *'` = every 12 hours

## 🎉 Result

- ✅ Cookie refreshes automatically every 6 hours
- ✅ Web app updates automatically
- ✅ Vercel redeploys automatically
- ✅ No Mac needed!
- ✅ 100% Free!

