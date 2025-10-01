# Vercel Deployment Guide

This guide explains how to deploy your Kusinaries Admin App to Vercel with the new Supabase publishable key.

## Prerequisites

1. A Vercel account (free at [vercel.com](https://vercel.com))
2. Your new Supabase project credentials
3. This repository pushed to GitHub/GitLab/Bitbucket

## Step 1: Get Your New Supabase Credentials

1. Go to your Supabase dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (e.g., `https://your-project-ref.supabase.co`)
   - **Project API keys** → **anon** → **public** (this is your publishable key)
   - **Project API keys** → **service_role** (keep this secret!)

## Step 2: Update Local Environment (Optional)

If you want to test with the new keys locally first:

1. Open your `.env` file
2. Replace the values with your new credentials:

```env
VITE_SUPABASE_URL=https://your-new-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key-here
VITE_SERVICE_ROLE_KEY=your-new-service-role-key-here
```

3. Test locally with: `npm run dev`

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import your repository
4. **Before deploying**, click **"Environment Variables"**
5. Add these environment variables:

   | Name | Value | Description |
   |------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | `your-anon-key` | Your Supabase publishable/anon key |
   | `VITE_SERVICE_ROLE_KEY` | `your-service-role-key` | Your Supabase service role key |

6. Click **"Deploy"**

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. In your project directory: `vercel`
4. Follow the prompts to set up your project
5. Add environment variables:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY  
   vercel env add VITE_SERVICE_ROLE_KEY
   ```
6. Redeploy: `vercel --prod`

## Step 4: Verify Deployment

1. Visit your Vercel deployment URL
2. Test the login functionality
3. Check browser console for any Supabase connection errors
4. Verify that data loads correctly

## Environment Variables Security

- ✅ **VITE_SUPABASE_URL**: Safe to expose (public)
- ✅ **VITE_SUPABASE_ANON_KEY**: Safe to expose (public/publishable key)
- ❌ **VITE_SERVICE_ROLE_KEY**: Keep secret! Only add to Vercel env vars, never commit to code

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Check that you copied the correct anon key
2. **"Invalid project URL"**: Ensure URL includes `https://` and ends with `.supabase.co`
3. **CORS errors**: Check your Supabase project settings → Authentication → Site URL

### Debug Steps:

1. Check Vercel deployment logs: `vercel logs`
2. Verify environment variables in Vercel dashboard
3. Test API connection in browser console:
   ```javascript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10) + '...');
   ```

## Automatic Deployments

Once set up, Vercel will automatically deploy when you:
- Push to your main branch (production)
- Push to other branches (preview deployments)

## Managing Multiple Environments

For different environments (dev/staging/prod), you can:

1. Create separate Supabase projects for each environment
2. Use Vercel's environment-specific variables:
   - Production: Set in Vercel dashboard
   - Preview: Set different values for preview deployments
   - Development: Use your local `.env` file

## Need Help?

- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Supabase Documentation: [supabase.com/docs](https://supabase.com/docs)
- Check your Vercel deployment logs for specific error messages