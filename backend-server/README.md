# Backend API Server

Flask REST API for receiving and storing session data from the Chrome extension.

## Features

- RESTful API endpoints for session management
- Supabase PostgreSQL database integration
- SQLAlchemy ORM for database operations
- Compressed JSON file storage for raw data
- CORS enabled for Chrome extension
- Vercel serverless deployment ready

## Setup

### Local Development

```bash
# Install dependencies
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start server
python app.py
```

Server runs on http://localhost:5000

### Production Deployment (Vercel)

```bash
# Deploy to Vercel
vercel --prod

# Expected URL: https://geo-exploration-backend.vercel.app
```

## Environment Variables

Required in `.env` or Vercel environment:

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres.PROJECT:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://pycqquvjgiojipxcmehl.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Application
DEBUG=False
SECRET_KEY=your-secret-key
DATA_STORAGE_PATH=/tmp/sessions

# Security
ALLOWED_ORIGINS=*  # Restrict in production
MAX_CONTENT_LENGTH=52428800
```

## Database Configuration

### Supabase Connection

**Session Mode (Port 5432)** - Recommended for persistent Flask server

```bash
DATABASE_URL=postgresql://postgres.pycqquvjgiojipxcmehl:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Transaction Mode (Port 6543)** - For serverless only (requires additional config)

### Database Schema

Tables are created automatically on first run:

- **sessions** - Session metadata and statistics
- **session_events** - Individual user events with JSONB storage
- **uploads** - Batch upload tracking

Indexes created on:
- Foreign keys
- session_id, participant_id
- event_type, timestamp
- JSONB data (GIN index)

## API Reference

### Health Check

```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00"
}
```

### Statistics

```
GET /api/sessions/stats
```

Response:
```json
{
  "total_sessions": 100,
  "active_sessions": 5,
  "complete_sessions": 95,
  "total_events": 50000,
  "total_participants": 25
}
```

### List Sessions

```
GET /api/sessions/list?participant_id=P001&limit=50&offset=0
```

Query parameters:
- `participant_id` (optional): Filter by participant
- `is_active` (optional): true/false
- `is_complete` (optional): true/false
- `limit` (default: 100): Results per page
- `offset` (default: 0): Pagination offset

### Get Session Details

```
GET /api/sessions/<session_id>
```

Returns session info with event summary and upload details.

### Get Session Events

```
GET /api/sessions/<session_id>/events?event_type=click&limit=1000
```

Query parameters:
- `event_type` (optional): Filter by type
- `limit` (default: 1000)
- `offset` (default: 0)

### Export Session

```
GET /api/sessions/<session_id>/export
```

Downloads complete session data as JSON file.

### Upload Session Data

```
POST /api/sessions/upload
Content-Type: application/json
```

Request body:
```json
{
  "sessionId": "session_123456",
  "participantId": "P001",
  "events": [
    {
      "type": "page_load",
      "timestamp": 1705315800000,
      "url": "https://example.com"
    }
  ],
  "uploadTimestamp": 1705315800000
}
```

Response:
```json
{
  "success": true,
  "session_id": "session_123456",
  "events_received": 1,
  "upload_id": 42
}
```

## Vercel Configuration

File: `vercel.json`

```json
{
  "version": 2,
  "builds": [{"src": "app.py", "use": "@vercel/python"}],
  "routes": [{"src": "/(.*)", "dest": "app.py"}],
  "env": {
    "DATABASE_URL": "...",
    "SUPABASE_URL": "...",
    "SUPABASE_SERVICE_KEY": "...",
    "DEBUG": "False"
  }
}
```

## Testing

### Test Supabase Connection

```bash
python test_supabase.py
```

Verifies:
- Database connection
- Table existence
- Indexes
- Foreign keys
- Data operations

### Test API Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Stats
curl http://localhost:5000/api/sessions/stats

# List sessions
curl http://localhost:5000/api/sessions/list
```

### Test Upload

```bash
curl -X POST http://localhost:5000/api/sessions/upload \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_123",
    "participantId": "TEST_001",
    "events": [{"type": "test", "timestamp": 1705315800000}],
    "uploadTimestamp": 1705315800000
  }'
```

## Database Schema Details

### sessions Table

```sql
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(128) UNIQUE NOT NULL,
    participant_id VARCHAR(64) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    total_events INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    is_complete BOOLEAN DEFAULT FALSE,
    user_agent TEXT,
    timezone VARCHAR(64),
    screen_width INTEGER,
    screen_height INTEGER
);
```

### session_events Table

```sql
CREATE TABLE session_events (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES sessions(id),
    event_type VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    event_data JSONB NOT NULL,
    url TEXT,
    title TEXT,
    tab_id INTEGER,
    upload_id BIGINT REFERENCES uploads(id)
);

CREATE INDEX idx_session_events_event_data ON session_events USING GIN (event_data);
```

## File Storage

Session data is stored in two locations:

1. **Database**: Structured metadata for querying
2. **Files**: Raw event data as compressed JSON

File structure:
```
data/sessions/
├── P001/
│   └── session_123/
│       └── upload_1_20250115.json.gz
└── P002/
    └── session_456/
        └── upload_2_20250115.json.gz
```

On Vercel, files are stored in `/tmp/sessions` (temporary, lost on redeployment).

For persistent file storage, use Supabase Storage (see utilities in `utils/supabase_client.py`).

## Monitoring

### Vercel Logs

```bash
vercel logs
```

Or visit Vercel Dashboard > Deployments > View Logs

### Supabase Monitoring

Go to Supabase Dashboard:
- Table Editor: View data
- Logs: View database queries
- Reports: Monitor usage and performance

### Application Logs

```bash
# Local development
python app.py
# Check console output

# Production (Vercel)
vercel logs --follow
```

## Troubleshooting

**Database Connection Failed**
- Verify DATABASE_URL format
- Check password is correct
- Test with: `python test_supabase.py`
- Try direct connection (port 5432) vs pooled (6543)

**CORS Errors**
- Verify CORS is enabled in app.py
- Check extension origin is allowed
- Update ALLOWED_ORIGINS if needed

**Upload Endpoint Timeout**
- Check payload size < 50MB
- Verify database connection is active
- Check Vercel function timeout (default 10s)

**Table Not Found**
- Ensure db.create_all() runs on startup
- Check Supabase dashboard for tables
- Run migrations if needed

## Performance Optimization

For high-traffic deployments:

```python
# Add to app.py after line 27
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 5,
    'max_overflow': 10,
    'pool_pre_ping': True,
    'pool_recycle': 3600
}
```

## Security Considerations

**Production Recommendations:**

1. Restrict CORS origins:
```python
ALLOWED_ORIGINS = [
    'chrome-extension://your-extension-id',
    'https://geo-exploration.vercel.app'
]
```

2. Generate strong SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

3. Enable rate limiting (optional):
```bash
pip install flask-limiter
```

## Additional Resources

- Supabase Docs: https://supabase.com/docs
- Flask Docs: https://flask.palletsprojects.com/
- SQLAlchemy Docs: https://docs.sqlalchemy.org/
- Vercel Docs: https://vercel.com/docs
