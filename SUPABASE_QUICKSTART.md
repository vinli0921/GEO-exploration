# Supabase Production Setup - Quick Start

Your Supabase database is now configured and ready for production! 🎉

## What's Been Done

✅ **Database Created**
- `sessions` table - Session metadata and statistics
- `session_events` table - Individual user events
- `uploads` table - Batch upload tracking
- All indexes and foreign keys configured
- Automatic timestamp updates enabled

✅ **Backend Updated**
- Environment configuration templates created
- Supabase Python client integration added
- Requirements.txt updated with PostgreSQL drivers
- Utility functions for Supabase Storage (optional)

✅ **Documentation**
- Complete setup guide: `backend-server/SUPABASE_SETUP.md`
- Environment templates: `.env.example`, `.env.production`
- Test script: `test_supabase.py`

## Your Supabase Details

**Project URL**: `https://pycqquvjgiojipxcmehl.supabase.co`

**Database Tables**:
- ✅ sessions (0 rows)
- ✅ session_events (0 rows)
- ✅ uploads (0 rows)

## Quick Setup (5 minutes)

### 1. Get Your Database Password

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **Database**
3. Copy your database password (or reset if you forgot it)

### 2. Get Connection String

In Supabase Dashboard → **Settings** → **Database** → **Connection String**:

**For Production (recommended)**:
```
postgresql://postgres.pycqquvjgiojipxcmehl:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 3. Configure Backend

Create `.env` file in `backend-server/` directory:

```bash
cd backend-server
cp .env.production .env
```

Edit `.env` and replace `[YOUR-PASSWORD]`:

```bash
# Supabase Database Connection
DATABASE_URL=postgresql://postgres.pycqquvjgiojipxcmehl:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Optional: Get from Supabase Dashboard → Settings → API
SUPABASE_URL=https://pycqquvjgiojipxcmehl.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Data storage
DATA_STORAGE_PATH=./data/sessions

# Security
SECRET_KEY=your-random-secret-key
ALLOWED_ORIGINS=*  # Change in production!
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `psycopg2-binary` - PostgreSQL driver
- `supabase` - Supabase Python client
- `gunicorn` - Production server
- All other dependencies

### 5. Test Connection

```bash
python test_supabase.py
```

You should see:
```
🎉 All tests passed! Supabase is ready to use.
```

### 6. Start Backend Server

**Development**:
```bash
python app.py
```

**Production**:
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 7. Verify API

```bash
curl http://localhost:5000/api/health
# Should return: {"status": "healthy", "database": "connected", ...}

curl http://localhost:5000/api/sessions/stats
# Should return: {"total_sessions": 0, "active_sessions": 0, ...}
```

## Testing End-to-End

### Test with Chrome Extension

1. **Load Extension** in Chrome (`chrome://extensions/`)
2. **Enter test participant ID**: `TEST001`
3. **Start recording**
4. **Browse a few websites**
5. **Stop and upload**

### Verify Data in Supabase

Go to Supabase Dashboard → **Table Editor**:

```sql
-- View sessions
SELECT * FROM sessions ORDER BY created_at DESC;

-- View events
SELECT * FROM session_events ORDER BY timestamp DESC LIMIT 10;

-- View uploads
SELECT * FROM uploads ORDER BY upload_timestamp DESC;
```

Or use the Admin Dashboard at `http://localhost:8080`

## Architecture Overview

```
Chrome Extension
    ↓ (batch upload every 5 min)
Flask Backend (app.py)
    ↓ (SQLAlchemy ORM)
Supabase PostgreSQL
    ├── sessions table
    ├── session_events table (with JSONB events)
    └── uploads table

[Optional]
    → Supabase Storage (for large files)
```

## Key Features

### Database Features
- **PostgreSQL 15** - Full SQL database
- **JSONB storage** - Flexible event data with GIN indexes
- **Foreign keys** - Data integrity enforced
- **Automatic timestamps** - Created/updated tracking
- **Pooled connections** - Better performance

### Backend Features
- **SQLAlchemy ORM** - Easy database queries
- **Flask REST API** - Standard endpoints
- **CORS enabled** - Works with Chrome extensions
- **Compression** - Efficient file storage
- **Batch uploads** - Reduced network overhead

### Optional: Supabase Storage

For storing large files in the cloud instead of local disk:

1. **Create bucket** in Supabase Dashboard → Storage
2. **Update .env**: `STORAGE_BACKEND=supabase`
3. **Use utilities**: `from utils.supabase_client import get_supabase_manager`

See `backend-server/SUPABASE_SETUP.md` for full instructions.

## Monitoring

### Supabase Dashboard

- **Database** → View tables, run SQL queries
- **Table Editor** → Browse data like Excel
- **Logs** → View PostgreSQL logs
- **Reports** → Database usage and performance

### Admin Dashboard

Start dashboard: `cd admin-dashboard && python -m http.server 8080`

Visit: `http://localhost:8080`

View:
- Real-time statistics
- All sessions and participants
- Individual session details
- Export data

## Common Issues

### Connection Error

**Problem**: `could not connect to server`

**Solution**:
- Check DATABASE_URL is correct
- Verify password has no typos
- Try direct connection instead of pooled (port 5432 instead of 6543)
- Check firewall settings

### SSL Error

**Problem**: `SSL connection error`

**Solution**: Add SSL mode to connection string:
```
DATABASE_URL=postgresql://...?sslmode=require
```

### Import Error

**Problem**: `ModuleNotFoundError: No module named 'psycopg2'`

**Solution**:
```bash
pip install psycopg2-binary
```

### No Data Showing

**Problem**: Extension uploads but no data in database

**Solution**:
1. Check backend logs for errors
2. Verify CORS is configured correctly
3. Check extension API endpoint matches backend URL
4. Review Supabase logs for query errors

## Production Checklist

Before deploying to production:

- [ ] Update DATABASE_URL with production password
- [ ] Set DEBUG=False in .env
- [ ] Generate strong SECRET_KEY
- [ ] Configure ALLOWED_ORIGINS with specific extension ID
- [ ] Enable Supabase Row Level Security (optional)
- [ ] Set up automated database backups
- [ ] Configure monitoring (Sentry, etc.)
- [ ] Test with multiple concurrent users
- [ ] Document deployment process
- [ ] Plan for scaling (connection pooling, caching)

## Next Steps

1. **Test thoroughly** with pilot participants
2. **Monitor performance** in Supabase dashboard
3. **Set up backups** (Supabase does this automatically)
4. **Add monitoring** (optional: Sentry, LogRocket)
5. **Scale as needed** (upgrade Supabase plan if necessary)

## Support Resources

### Documentation
- [Full Supabase Setup Guide](backend-server/SUPABASE_SETUP.md)
- [Backend README](backend-server/README.md)
- [Main Project README](README.md)

### Supabase
- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [Python Client Docs](https://supabase.com/docs/reference/python)
- [Supabase Dashboard](https://supabase.com/dashboard)

### Testing
```bash
# Test connection
python test_supabase.py

# View database directly
psql $DATABASE_URL

# Check API health
curl http://localhost:5000/api/health
```

---

## Summary

✅ Supabase PostgreSQL database configured
✅ Backend ready for production
✅ Test script available
✅ Full documentation provided

**You're ready to collect research data at scale!** 🚀

For detailed information, see `backend-server/SUPABASE_SETUP.md`
