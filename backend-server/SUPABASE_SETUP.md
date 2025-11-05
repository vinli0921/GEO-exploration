# Supabase Production Setup Guide

This guide walks you through setting up Supabase as your production database for the LLM Search Behavior Study platform.

## Overview

Your backend is now configured to work with Supabase PostgreSQL database. The database schema has been created with:
- ✅ `sessions` table - Stores session metadata
- ✅ `session_events` table - Stores individual events
- ✅ `uploads` table - Tracks batch uploads
- ✅ All indexes and foreign keys configured
- ✅ Automatic timestamp updates

**Supabase Project URL**: `https://pycqquvjgiojipxcmehl.supabase.co`

---

## Step 1: Get Your Database Connection String

### Option A: Pooled Connection (Recommended for Production)

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **Database**
3. Under **Connection String**, select **URI**
4. Copy the **Transaction mode** connection string:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### Option B: Direct Connection (For Development/Testing)

Use the direct connection string:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Important**: Replace `[YOUR-PASSWORD]` with your actual database password.

---

## Step 2: Configure Backend Environment

### Production Configuration

Create `.env` file in `backend-server/` directory:

```bash
cd backend-server
cp .env.production .env
```

Edit `.env` and update:

```bash
# Flask settings
DEBUG=False
PORT=5000

# Supabase Database (REQUIRED)
DATABASE_URL=postgresql://postgres.pycqquvjgiojipxcmehl:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Supabase API (Optional, for Storage features)
SUPABASE_URL=https://pycqquvjgiojipxcmehl.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Data storage
DATA_STORAGE_PATH=./data/sessions

# Security
SECRET_KEY=your-random-secret-key-change-this
ALLOWED_ORIGINS=chrome-extension://your-extension-id
```

### Get Your Supabase Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_KEY` (keep secret!)

---

## Step 3: Install Dependencies

```bash
cd backend-server
pip install -r requirements.txt
```

This installs:
- `psycopg2-binary` - PostgreSQL driver
- `supabase` - Supabase Python client
- `gunicorn` - Production server
- All other dependencies

---

## Step 4: Verify Database Connection

Test the connection:

```bash
python -c "
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute('SELECT version();')
    print('✅ Connected to:', result.fetchone()[0])
"
```

You should see PostgreSQL version information.

---

## Step 5: Start Backend Server

### Development Mode

```bash
python app.py
```

### Production Mode (with Gunicorn)

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Options:
- `-w 4` - 4 worker processes
- `-b 0.0.0.0:5000` - Bind to all interfaces on port 5000
- `app:app` - Flask app module and instance

---

## Step 6: Verify API Connection

Test the API:

```bash
# Health check
curl http://localhost:5000/api/health

# Should return:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2025-01-15T10:30:00"
# }

# Statistics
curl http://localhost:5000/api/sessions/stats
```

---

## Step 7: Update Chrome Extension

Update the API endpoint in the extension:

1. Open `chrome-extension/background.js`
2. Update line 12:
   ```javascript
   uploadEndpoint: 'https://your-production-url.com/api/sessions/upload',
   ```

Or if testing locally with Supabase:
```javascript
uploadEndpoint: 'http://localhost:5000/api/sessions/upload',
```

---

## Database Schema Details

### Tables Created

#### sessions
```sql
- id (bigserial, primary key)
- session_id (varchar, unique)
- participant_id (varchar, indexed)
- started_at, ended_at (timestamptz)
- user_agent, timezone
- screen_width, screen_height
- total_events, total_pages
- duration_seconds
- is_active, is_complete (boolean)
```

#### session_events
```sql
- id (bigserial, primary key)
- session_id (bigint, foreign key → sessions)
- event_type (varchar, indexed)
- timestamp (timestamptz, indexed)
- event_data (jsonb with GIN index)
- url, title, tab_id
- upload_id (foreign key → uploads)
```

#### uploads
```sql
- id (bigserial, primary key)
- session_id (bigint, foreign key → sessions)
- upload_timestamp (timestamptz)
- event_count, data_size_bytes
- file_path
- is_compressed, is_processed
- processed_at
```

### Indexes Created

Performance-optimized indexes on:
- All foreign keys
- Frequently queried columns (session_id, participant_id, event_type)
- Timestamps (for date range queries)
- JSONB data (for event_data queries)

---

## Optional: Supabase Storage for Files

To use Supabase Storage instead of local file storage:

### 1. Create Storage Bucket

Via Supabase Dashboard:
1. Go to **Storage**
2. Click **New bucket**
3. Name: `session-data`
4. Public: **No** (private bucket)

Or via API:
```python
from utils.supabase_client import get_supabase_manager

manager = get_supabase_manager()
manager.create_bucket('session-data', public=False)
```

### 2. Update Configuration

In `.env`:
```bash
STORAGE_BACKEND=supabase
SUPABASE_BUCKET=session-data
```

### 3. Update Upload Code

In `api/sessions.py`, replace file save with:
```python
from utils.supabase_client import get_supabase_manager

if os.getenv('STORAGE_BACKEND') == 'supabase':
    manager = get_supabase_manager()
    file_path = f"{participant_id}/{session_id}/upload_{upload.id}.json.gz"
    result = manager.upload_session_file('session-data', file_path, gzip_data)
    upload.file_path = f"supabase://{file_path}"
else:
    # Local file storage (existing code)
    ...
```

---

## Security Best Practices

### 1. Row Level Security (RLS)

Enable RLS for additional security:

```sql
-- Enable RLS on tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Example policy: Service role can do everything
CREATE POLICY "Service role has full access"
ON sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Repeat for other tables
```

### 2. API Keys

- **Never** commit `.env` file to Git
- Use **anon key** for client-side (if needed)
- Use **service_role key** only on backend (more permissions)
- Rotate keys periodically

### 3. Database Password

- Use a strong, unique password
- Store in environment variables only
- Never hard-code in source files

### 4. CORS Configuration

Update `app.py` to restrict origins:

```python
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "chrome-extension://your-actual-extension-id",
            "https://your-admin-dashboard.com"
        ],
        ...
    }
})
```

---

## Monitoring & Maintenance

### Check Database Usage

Supabase Dashboard → **Database** → **Usage**
- Monitor database size
- Check number of rows
- Review query performance

### View Logs

Supabase Dashboard → **Logs** → **Postgres Logs**
- Query errors
- Slow queries
- Connection issues

### Backup Strategy

Supabase automatically backs up your database:
- Daily backups (7 days retention on free tier)
- Point-in-time recovery available on paid plans

For additional backups:
```bash
# Export all data
curl http://your-api.com/api/sessions/list > backup_sessions.json
```

---

## Troubleshooting

### Connection Refused Error

**Problem**: `psycopg2.OperationalError: could not connect to server`

**Solutions**:
- Verify DATABASE_URL is correct
- Check password has no typos
- Ensure no firewall blocking port 5432 or 6543
- Try direct connection instead of pooled

### SSL Connection Error

**Problem**: `SSL connection error`

**Solution**: Add SSL mode to connection string:
```
DATABASE_URL=postgresql://...?sslmode=require
```

### Too Many Connections

**Problem**: `FATAL: remaining connection slots reserved`

**Solutions**:
- Use **pooled connection** (port 6543) instead of direct (port 5432)
- Reduce worker count in Gunicorn
- Enable connection pooling in SQLAlchemy:
  ```python
  app.config['SQLALCHEMY_POOL_SIZE'] = 5
  app.config['SQLALCHEMY_MAX_OVERFLOW'] = 10
  ```

### Slow Queries

**Problem**: API responses are slow

**Solutions**:
- Check indexes are created (run migrations again)
- Review query patterns in Supabase logs
- Add pagination to large queries
- Use EXPLAIN ANALYZE on slow queries

### Data Not Appearing

**Problem**: Extension uploads but data doesn't show

**Solutions**:
1. Check backend logs for errors
2. Verify session was created:
   ```sql
   SELECT * FROM sessions ORDER BY created_at DESC LIMIT 5;
   ```
3. Check foreign key constraints
4. Review upload error logs

---

## Migration from SQLite to Supabase

If you have existing SQLite data to migrate:

### 1. Export from SQLite

```python
import sqlite3
import json

conn = sqlite3.connect('llm_search_behavior.db')
cursor = conn.cursor()

# Export sessions
cursor.execute('SELECT * FROM sessions')
sessions = cursor.fetchall()

with open('sessions_export.json', 'w') as f:
    json.dump(sessions, f)

# Repeat for other tables
```

### 2. Import to Supabase

```python
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

# Import sessions
with open('sessions_export.json') as f:
    sessions = json.load(f)
    for session in sessions:
        cursor.execute(
            'INSERT INTO sessions (...) VALUES (...)',
            session
        )

conn.commit()
```

Or use Supabase migration tools.

---

## Scaling Considerations

### Database Performance

- **Current plan**: Check your Supabase plan limits
- **Free tier**: Suitable for up to ~500MB data, 50 simultaneous connections
- **Paid tiers**: Unlimited data, more connections, better performance

### File Storage

- Store large event batches in Supabase Storage
- Keep only metadata in database
- Implement cleanup for old files

### Backend Scaling

- Use Gunicorn with multiple workers
- Deploy on cloud platform (AWS, Heroku, Railway, Fly.io)
- Add Redis for caching (optional)
- Implement rate limiting

---

## Support & Resources

### Supabase Documentation
- [Database](https://supabase.com/docs/guides/database)
- [Storage](https://supabase.com/docs/guides/storage)
- [Python Client](https://supabase.com/docs/reference/python)

### Project Resources
- [Backend README](README.md)
- [Main README](../README.md)
- [API Documentation](README.md#api-endpoints)

### Need Help?

- **Database Issues**: Check Supabase Dashboard logs
- **Connection Problems**: Verify environment variables
- **API Errors**: Check Flask logs and CORS settings
- **Performance**: Review indexes and query patterns

---

## Quick Reference

```bash
# Check connection
python -c "from app import app, db; app.app_context().push(); db.session.execute('SELECT 1')"

# View tables
psql $DATABASE_URL -c "\dt"

# Count rows
psql $DATABASE_URL -c "SELECT COUNT(*) FROM sessions;"

# Recent sessions
psql $DATABASE_URL -c "SELECT session_id, participant_id, started_at FROM sessions ORDER BY started_at DESC LIMIT 5;"

# Start production server
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# View logs
tail -f nohup.out
```

---

**Setup Complete!** Your backend is now running on Supabase PostgreSQL. 🎉

Test the full workflow:
1. Start backend server
2. Load Chrome extension
3. Record a test session
4. View in admin dashboard
5. Verify data in Supabase Dashboard
