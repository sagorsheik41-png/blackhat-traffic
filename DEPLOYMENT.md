# BlackHat Traffic SaaS — Deployment Guide

This document outlines the steps to deploy the Unified SaaS Platform to **Vercel** with **Supabase Authentication**.

## 1. Prerequisites
- Node.js v18 or higher
- Vercel account (free at vercel.com)
- Supabase Project (for Authentication & Database)
- MongoDB instance (local or Atlas - if keeping legacy data here)
- Vercel CLI `npm install -g vercel`

## 2. Environment Variables
When deploying to Vercel, ensure you add the following Environment Variables in the Vercel dashboard:

```env
PORT=3000
NODE_ENV=production

# MongoDB (For Legacy Data)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/bh_saas?retryWrites=true&w=majority

# Supabase Authentication Details
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>

# Additional Config
JWT_SECRET=your_super_long_random_64_char_string
SESSION_SECRET=another_super_long_random_string
```

## 3. Deploying using Vercel CLI (Recommended)

1. Open a terminal in the project directory.
2. Login to Vercel:
   ```bash
   vercel login
   ```
3. Deploy the project:
   ```bash
   vercel --prod
   ```
4. Follow the prompts. Say `Y` to set up and deploy. Vercel will automatically read `vercel.json` and deploy your Express API endpoints and statically serve your assets.

## 4. Post-Deployment Checklist
1. Once deployed, copy your new Vercel production URL (e.g., `https://blackhat-traffic.vercel.app`).
2. Go to your **Supabase Dashboard** -> **Authentication** -> **URL Configuration**.
3. Set your **Site URL** to the new Vercel production URL.
4. Go to `https://vercel-app-url/auth/register` and register the first admin account to test that MongoDB connection is active and Supabase token flow works in the cloud.
