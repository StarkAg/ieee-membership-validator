# Deployment Guide

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `ieee-membership-validator`)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)

## Step 2: Push to GitHub

```bash
cd web-app
git remote add origin https://github.com/YOUR_USERNAME/ieee-membership-validator.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI

1. Install Vercel CLI (if not already installed):
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No**
   - What's your project's name? (Press Enter for default)
   - In which directory is your code located? **./** (Press Enter)
   - Want to override the settings? **No**

5. Your app will be deployed! You'll get a URL like `https://your-app.vercel.app`

### Option B: Using GitHub Integration (Recommended)

1. Go to [Vercel](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js settings
6. Click "Deploy"
7. Your app will be live in minutes!

## Step 4: Verify Deployment

1. Visit your Vercel deployment URL
2. Test the application:
   - Enter your cookie
   - Paste some IEEE member numbers
   - Click "Validate Memberships"
   - Verify results appear correctly

## Troubleshooting

- **Build fails**: Make sure all dependencies are in `package.json`
- **API errors**: Check Vercel function logs in the dashboard
- **CORS issues**: Next.js API routes handle CORS automatically

## Environment Variables

No environment variables needed for this app - the cookie is entered by the user in the UI.

