# Deployment Guide - Vercel

This guide explains how to deploy the GEO Exploration project to Vercel.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- Supabase project created (https://supabase.com)
- Git repository connected to Vercel

## Architecture

This project consists of two deployments:

1. **Backend Server** (`backend-server/`) - Python Flask API
2. **Admin Dashboard** (`admin-dashboard/`) - Next.js frontend

---

## Part 1: Deploy Backend Server

### Step 1: Get Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings → Database**
4. Scroll down to **Connection String**
5. Click the **URI** tab (not the default)
6. **CRITICAL**: In the dropdown, select **Transaction** mode (not Session)
7. Click **Copy** to copy the complete connection string
8. **IMPORTANT**: The connection string will look like:
   ```
   postgresql://postgres.PROJECT_REF:[YOUR-PASSWORD]@aws-X-REGION.pooler.supabase.com:6543/postgres
   ```
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - The region (e.g., `aws-1-us-east-2`, `aws-0-us-east-1`) varies by project
   - **Copy the EXACT string from your dashboard** - don't guess the region!

9. Also get from **Settings → API**:
   - Project URL (SUPABASE_URL) - e.g., `https://your-project.supabase.co`
   - Service role key (SUPABASE_SERVICE_KEY) - click "Reveal" to show it

### Step 2: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New → Project**
3. Import your Git repository
4. In **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: `backend-server`
   - Leave build settings as default (Vercel will auto-detect Python)
5. Click **Deploy**

### Step 3: Configure Environment Variables

After deployment, go to your project in Vercel:

1. Navigate to **Settings → Environment Variables**
2. Add the following variables (click **Add** for each):

#### Required Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres` | Supabase connection string (Transaction Mode, port 6543) |
| `SUPABASE_URL` | `https://PROJECT_REF.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | `eyJhbGc...` | Supabase service role key (from Dashboard → API) |
| `SECRET_KEY` | `your-random-secret-key` | Flask secret key (generate a strong random string) |
| `DEBUG` | `False` | Disable debug mode in production |
| `ALLOWED_ORIGINS` | `*` or specific origins | CORS configuration (use specific origins in production) |
| `DATA_STORAGE_PATH` | `/tmp/sessions` | Temporary file storage path for Vercel |
| `MAX_CONTENT_LENGTH` | `52428800` | Max upload size (50MB in bytes) |

#### Important Notes:

- **DATABASE_URL Format**: Must be `postgres.PROJECT_REF` (not just `PROJECT_REF`)
- **Port 6543**: Critical for serverless - uses Transaction Mode for short-lived connections
- **Port 5432**: Session Mode - NOT recommended for Vercel (causes connection issues)
- Set environment variables for **Production** and optionally for **Preview** environments

### Step 4: Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Select **Redeploy**
4. Choose **Use existing Build Cache** (faster)

### Step 5: Verify Backend Deployment

1. Go to your deployment URL (e.g., `https://geo-exploration-backend.vercel.app`)
2. Test the health endpoint: `https://your-backend.vercel.app/api/health`
3. Should return: `{"status": "healthy", "database": "connected"}`

If you see errors, check the **Logs** in Vercel Dashboard.

---

## Part 2: Deploy Admin Dashboard

### Step 1: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New → Project**
3. Import the same Git repository
4. In **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `admin-dashboard`
   - Leave build settings as default
5. Click **Deploy**

### Step 2: Configure Environment Variables

After deployment, go to your project in Vercel:

1. Navigate to **Settings → Environment Variables**
2. Add the following variable:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://geo-exploration-backend.vercel.app/api` | Backend API URL (from Part 1) |

**Important**: Replace `geo-exploration-backend` with your actual backend deployment URL.

### Step 3: Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Select **Redeploy**

### Step 4: Verify Admin Dashboard

1. Visit your dashboard URL (e.g., `https://geo-exploration-admin.vercel.app`)
2. Should load without console errors
3. Check that data from backend API is displayed correctly

---

## Troubleshooting

### Issue: "Tenant or user not found" error

**Cause**: Incorrect DATABASE_URL - usually wrong pooler region or incorrect credentials

**Solutions**:
1. **MOST COMMON**: Verify the pooler host region matches your Supabase Dashboard exactly
   - Could be `aws-0-us-east-1`, `aws-1-us-east-2`, `aws-2-eu-west-1`, etc.
   - The region varies by project - don't copy from examples, use YOUR exact connection string!
2. Ensure you're using port **6543** (Transaction Mode), not 5432
3. Verify username format is `postgres.PROJECT_REF` (with the dot)
4. Double-check you copied the password correctly (no extra spaces or quotes)
5. Go back to Supabase Dashboard → Settings → Database → Connection String → Transaction and copy the ENTIRE string again

### Issue: Backend returns 500 errors

**Cause**: Missing or incorrect environment variables

**Solutions**:
1. Check Vercel logs: **Deployments → [Latest] → Runtime Logs**
2. Verify all required environment variables are set
3. Check for typos in variable names (they're case-sensitive)
4. Ensure `DATABASE_URL` starts with `postgresql://` (not `postgres://`)
5. Redeploy after fixing environment variables

### Issue: Admin Dashboard shows "Failed to fetch"

**Cause**: Incorrect API URL or CORS issues

**Solutions**:
1. Verify `NEXT_PUBLIC_API_URL` matches your backend URL
2. Check backend allows requests from dashboard origin (ALLOWED_ORIGINS)
3. Test backend health endpoint directly in browser
4. Check browser console for specific error messages

### Issue: Database connection timeout

**Cause**: Wrong pooler host or network issues

**Solutions**:
1. Verify the pooler host in your connection string matches Supabase Dashboard
2. Some projects use different regions (e.g., `aws-1-us-east-2.pooler.supabase.com`)
3. Try increasing the connection timeout in your SQLAlchemy config
4. Check Supabase project status at https://status.supabase.com

### Issue: Vercel build fails

**Cause**: Missing dependencies or incorrect build configuration

**Solutions**:
1. Check **Build Logs** in Vercel Dashboard
2. Ensure `requirements.txt` includes all dependencies
3. Verify Python version compatibility
4. Try clearing build cache and redeploying

---

## Connection Modes Explained

Supabase provides two connection modes via the pooler:

### Session Mode (Port 5432)
- **Use for**: Long-lived connections (traditional servers, local development)
- **How it works**: Maintains persistent connection throughout session
- **Not recommended for**: Vercel, AWS Lambda, or other serverless platforms

### Transaction Mode (Port 6543)
- **Use for**: Short-lived connections (Vercel, serverless functions)
- **How it works**: Creates new connection per transaction, automatically closes
- **Recommended for**: All serverless deployments
- **Why**: Prevents connection pool exhaustion from many short-lived function invocations

**For Vercel, ALWAYS use Transaction Mode (port 6543).**

---

## Security Best Practices

### DO:
- Set environment variables in Vercel Dashboard (not in code)
- Use strong, random SECRET_KEY values
- Restrict ALLOWED_ORIGINS to specific domains in production
- Keep `.env.production` as a template only (no real credentials)
- Regularly rotate database credentials
- Use Supabase Row Level Security (RLS) policies

### DON'T:
- Commit `.env` files with real credentials to git
- Hardcode credentials in `vercel.json` or code
- Use DEBUG=True in production
- Allow ALLOWED_ORIGINS=* in production (security risk)
- Share service role keys publicly

---

## Monitoring and Logs

### Backend Logs
- **Runtime Logs**: Vercel Dashboard → Deployments → [Latest] → Runtime Logs
- **Build Logs**: Vercel Dashboard → Deployments → [Latest] → Build Logs
- Look for database connection errors, API errors, or Python exceptions

### Frontend Logs
- **Runtime Logs**: Vercel Dashboard → Deployments → [Latest] → Runtime Logs
- **Browser Console**: Open DevTools → Console tab
- Look for fetch errors, API connection issues, or React errors

### Database Logs
- Supabase Dashboard → Database → Logs
- Monitor connection pool usage, slow queries, errors

---

## Environment Variables Checklist

Use this checklist to ensure all variables are set:

### Backend (`backend-server`)
- [ ] DATABASE_URL (Transaction Mode, port 6543)
- [ ] SUPABASE_URL
- [ ] SUPABASE_SERVICE_KEY
- [ ] SECRET_KEY
- [ ] DEBUG (set to "False")
- [ ] ALLOWED_ORIGINS
- [ ] DATA_STORAGE_PATH
- [ ] MAX_CONTENT_LENGTH

### Frontend (`admin-dashboard`)
- [ ] NEXT_PUBLIC_API_URL

---

## Useful Commands

### Generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Test backend locally:
```bash
cd backend-server
python app.py
# Visit http://localhost:5000/api/health
```

### Test admin dashboard locally:
```bash
cd admin-dashboard
npm install
npm run dev
# Visit http://localhost:3000
```

### Check Vercel deployment status:
```bash
vercel --version  # Install: npm i -g vercel
vercel ls         # List deployments
vercel logs [deployment-url]  # View logs
```

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review Vercel Runtime Logs for error details
3. Verify all environment variables are correctly set
4. Test the backend `/api/health` endpoint
5. Check Supabase project status and connection strings

For Vercel-specific issues, see: https://vercel.com/docs
For Supabase issues, see: https://supabase.com/docs
