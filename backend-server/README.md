# Backend API Server

Flask backend for receiving and storing session data from the Chrome extension.

## Features

- RESTful API for session data upload
- PostgreSQL/SQLite database storage
- Compressed JSON file storage for raw data
- Session and event management
- Data export capabilities
- Health checks and monitoring

## Setup

### 1. Install Dependencies

```bash
cd backend-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Initialize Database

For SQLite (development):
```bash
python app.py
# Database will be created automatically
```

For PostgreSQL (production):
```bash
# Create database
createdb llm_search_behavior

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@localhost:5432/llm_search_behavior

# Run migrations (tables created automatically on first run)
python app.py
```

### 4. Run Server

```bash
python app.py
```

Server will start on `http://localhost:5000`

## API Endpoints

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
      "url": "https://example.com",
      "title": "Example Page"
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

### List Sessions

```
GET /api/sessions/list?participant_id=P001&limit=50&offset=0
```

Query parameters:
- `participant_id` (optional): Filter by participant
- `is_active` (optional): Filter active sessions (true/false)
- `is_complete` (optional): Filter complete sessions (true/false)
- `limit` (default: 100): Number of results
- `offset` (default: 0): Pagination offset

Response:
```json
{
  "sessions": [
    {
      "id": 1,
      "session_id": "session_123456",
      "participant_id": "P001",
      "started_at": "2025-01-15T10:30:00",
      "ended_at": null,
      "total_events": 150,
      "total_pages": 10,
      "is_active": true
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### Get Session Details

```
GET /api/sessions/<session_id>
```

Response:
```json
{
  "id": 1,
  "session_id": "session_123456",
  "participant_id": "P001",
  "started_at": "2025-01-15T10:30:00",
  "total_events": 150,
  "event_summary": {
    "page_load": 10,
    "click": 50,
    "scroll": 90
  },
  "uploads": [
    {
      "id": 1,
      "upload_timestamp": "2025-01-15T10:35:00",
      "event_count": 50
    }
  ]
}
```

### Get Session Events

```
GET /api/sessions/<session_id>/events?event_type=click&limit=100
```

Query parameters:
- `event_type` (optional): Filter by event type
- `limit` (default: 1000): Number of results
- `offset` (default: 0): Pagination offset

Response:
```json
{
  "events": [
    {
      "id": 1,
      "event_type": "click",
      "timestamp": "2025-01-15T10:30:00",
      "event_data": {
        "element": { "tag": "button" },
        "coordinates": { "x": 100, "y": 200 }
      },
      "url": "https://example.com"
    }
  ],
  "total": 50,
  "limit": 100,
  "offset": 0
}
```

### Export Session

```
GET /api/sessions/<session_id>/export
```

Downloads complete session data as JSON file.

### Get Statistics

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

## Database Schema

### Sessions Table

- `id`: Primary key
- `session_id`: Unique session identifier
- `participant_id`: Participant identifier
- `started_at`: Session start timestamp
- `ended_at`: Session end timestamp (nullable)
- `total_events`: Total number of events
- `total_pages`: Number of unique pages visited
- `is_active`: Whether session is currently active
- `is_complete`: Whether session is complete
- `user_agent`: Browser user agent
- `timezone`: User timezone

### Session Events Table

- `id`: Primary key
- `session_id`: Foreign key to sessions
- `event_type`: Type of event (click, scroll, etc.)
- `timestamp`: Event timestamp
- `event_data`: JSON data for event
- `url`: Page URL
- `title`: Page title
- `tab_id`: Browser tab ID

### Uploads Table

- `id`: Primary key
- `session_id`: Foreign key to sessions
- `upload_timestamp`: When data was uploaded
- `event_count`: Number of events in upload
- `file_path`: Path to stored JSON file
- `is_compressed`: Whether file is compressed
- `is_processed`: Whether upload has been processed

## Data Storage

Session data is stored in two places:

1. **Database**: Structured data for querying (sessions, events metadata)
2. **Files**: Raw event data stored as compressed JSON files

File structure:
```
data/sessions/
├── P001/
│   └── session_123456/
│       ├── upload_1_20250115_103000.json.gz
│       └── upload_2_20250115_103500.json.gz
└── P002/
    └── session_789012/
        └── upload_3_20250115_110000.json.gz
```

## Development

### Running Tests

```bash
pytest
```

### Database Migrations

If you make changes to models, drop and recreate tables:

```bash
python
>>> from app import app, db
>>> with app.app_context():
...     db.drop_all()
...     db.create_all()
```

For production, use a migration tool like Alembic.

## Production Deployment

### Using Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Environment Variables

Set these in production:
- `DEBUG=False`
- `DATABASE_URL=postgresql://...`
- `SECRET_KEY=<random-key>`
- `ALLOWED_ORIGINS=chrome-extension://<your-id>`

## Monitoring

Monitor these metrics:
- Database connection health
- API response times
- Upload success rate
- Storage disk usage
- Error rates

## Backup

Regular backups recommended:

1. **Database**: Use pg_dump for PostgreSQL
2. **Files**: Backup `data/sessions` directory

```bash
# Database backup
pg_dump llm_search_behavior > backup_$(date +%Y%m%d).sql

# File backup
tar -czf sessions_backup_$(date +%Y%m%d).tar.gz data/sessions/
```

## Security Considerations

- Use HTTPS in production
- Restrict CORS to your extension ID only
- Implement rate limiting
- Sanitize all input data
- Encrypt sensitive data
- Regular security updates
- Monitor for suspicious activity

## Troubleshooting

### Database Connection Errors

Check DATABASE_URL format and credentials.

### CORS Errors

Verify extension origin in CORS configuration.

### File Storage Issues

Check DATA_STORAGE_PATH permissions and disk space.

## Support

For issues or questions, contact: research@university.edu
