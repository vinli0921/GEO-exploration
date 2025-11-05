# LLM Search Behavior Study - Research Platform

Comprehensive platform for tracking and analyzing user search behavior with Large Language Models (LLMs) vs. traditional search engines.

## Project Overview

This research platform consists of three integrated components:

1. **Chrome Extension**: Tracks user browsing behavior and search interactions
2. **Backend Server**: Receives, stores, and manages session data
3. **Admin Dashboard**: Web interface for viewing and exporting data

## Quick Start

### Prerequisites

- Google Chrome browser
- Python 3.11+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/GEO-exploration.git
cd GEO-exploration

# Install backend dependencies
cd backend-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start backend server
python app.py
```

### Load Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. Extension should now appear in your toolbar

### Open Admin Dashboard

```bash
cd admin-dashboard
python -m http.server 8080
# Visit http://localhost:8080
```

## Production with Supabase

For production deployment, this project is configured to use **Supabase PostgreSQL**:

✅ **Database Ready**: Tables created with indexes and foreign keys
✅ **Backend Configured**: SQLAlchemy ORM with PostgreSQL support
✅ **Test Suite**: Connection and integration tests included

**Quick Supabase Setup** (5 minutes):

1. Get your Supabase connection string from Dashboard → Settings → Database
2. Copy `backend-server/.env.production` to `.env` and add your password
3. Run `python backend-server/test_supabase.py` to verify connection
4. Start production server: `gunicorn -w 4 app:app`

See [**SUPABASE_QUICKSTART.md**](SUPABASE_QUICKSTART.md) for full setup guide.

**Your Supabase Project**: `https://pycqquvjgiojipxcmehl.supabase.co`

## Project Structure

```
GEO-exploration/
├── chrome-extension/          # Chrome extension for tracking
│   ├── manifest.json         # Extension configuration
│   ├── background.js         # Service worker
│   ├── popup/                # Extension UI
│   ├── scripts/              # Content scripts
│   └── storage/              # IndexedDB wrapper
│
├── backend-server/            # Flask API server
│   ├── app.py               # Main application
│   ├── models/              # Database models
│   ├── api/                 # API endpoints
│   └── utils/               # Utilities
│
├── admin-dashboard/           # Web dashboard
│   ├── index.html           # Dashboard UI
│   ├── app.js               # Dashboard logic
│   └── styles.css           # Styles
│
├── docs/                      # Documentation
│   ├── IRB_CONSENT_FORM_TEMPLATE.md
│   ├── PRIVACY_POLICY.md
│   ├── DATA_DICTIONARY.md
│   └── PARTICIPANT_INSTRUCTIONS.md
│
└── seranking/                 # SE Ranking API tools (existing)
    └── ...
```

## Components

### Chrome Extension

**Purpose**: Captures user browsing behavior during research sessions

**Features**:
- Full session recording (DOM snapshots + events)
- Search query extraction (Google, LLMs, etc.)
- Privacy controls (exclude domains, pause/resume)
- Local buffering + batch uploads
- IRB-compliant consent flow

**Technology**: JavaScript (ES6+), Chrome Extension APIs (Manifest V3)

[Full Documentation →](chrome-extension/README.md)

### Backend Server

**Purpose**: Receives and stores session data from extension

**Features**:
- RESTful API endpoints
- PostgreSQL/SQLite database
- Compressed JSON file storage
- Session and event management
- Data export capabilities

**Technology**: Python, Flask, SQLAlchemy, PostgreSQL

[Full Documentation →](backend-server/README.md)

### Admin Dashboard

**Purpose**: Web interface for researchers to view and export data

**Features**:
- Real-time statistics
- Session browsing and filtering
- Participant summaries
- Data export tools
- Session detail viewer

**Technology**: Vanilla HTML/CSS/JavaScript

[Full Documentation →](admin-dashboard/README.md)

## Research Workflow

### 1. Study Setup

1. Configure backend server and database
2. Prepare IRB documentation
3. Customize consent form in extension
4. Deploy admin dashboard
5. Test with pilot participants

### 2. Participant Recruitment

1. Distribute extension to participants
2. Provide participant IDs
3. Share installation instructions
4. Collect consent forms

### 3. Data Collection

1. Participants install extension
2. Participants provide consent
3. Participants browse normally
4. Data uploaded automatically
5. Monitor via admin dashboard

### 4. Data Analysis

1. Export session data from dashboard
2. Process with analysis scripts
3. Generate insights and visualizations
4. Publish findings

## Data Collected

The extension captures:

- **Navigation**: Page visits, URLs, titles, dwell time
- **Interactions**: Clicks, scrolls, form interactions
- **Search Queries**: Text entered in search engines and LLMs
- **Page Structure**: DOM snapshots, links, images
- **Timing**: Timestamps, sequence, duration
- **Context**: Browser info, screen size, timezone

See [Data Dictionary](docs/DATA_DICTIONARY.md) for complete field reference.

## Privacy & IRB Compliance

### IRB Documentation

Complete IRB templates provided:
- [Informed Consent Form](docs/IRB_CONSENT_FORM_TEMPLATE.md)
- [Privacy Policy](docs/PRIVACY_POLICY.md)
- [Participant Instructions](docs/PARTICIPANT_INSTRUCTIONS.md)

### Privacy Features

- Participant ID-based anonymization
- No PII collection (names, emails, IPs)
- Encrypted data transmission (HTTPS)
- Password/payment field redaction
- Excluded domain support
- Participant control (pause/stop anytime)
- Data deletion upon request

### Data Security

- Secure server storage
- Access-restricted database
- Compressed file storage
- Regular backups
- IRB-compliant retention policies

## API Reference

### Backend Endpoints

```
GET  /api/health                          # Health check
GET  /api/sessions/stats                  # Statistics
GET  /api/sessions/list                   # List sessions
GET  /api/sessions/<id>                   # Session details
GET  /api/sessions/<id>/events            # Session events
GET  /api/sessions/<id>/export            # Export session
POST /api/sessions/upload                 # Upload data (from extension)
```

See [Backend API Documentation](backend-server/README.md) for details.

## Development

### Running Tests

```bash
# Backend tests
cd backend-server
pytest

# Extension testing
# Load in Chrome and test manually
# Or use Chrome extension testing tools
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit pull request

### Code Style

- **Python**: PEP 8, use black formatter
- **JavaScript**: ES6+, use prettier
- **Documentation**: Markdown, clear and concise

## Deployment

### Production Checklist

- [ ] Update API endpoints in extension and dashboard
- [ ] Configure production database (PostgreSQL)
- [ ] Set DEBUG=False in backend
- [ ] Enable HTTPS for backend
- [ ] Restrict CORS to specific origins
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure automated backups
- [ ] Review and update IRB documentation
- [ ] Test full workflow end-to-end

### Hosting Options

**Backend**:
- AWS EC2 / Elastic Beanstalk
- Heroku
- DigitalOcean
- University servers

**Dashboard**:
- Netlify
- Vercel
- GitHub Pages
- Same server as backend

**Database**:
- AWS RDS (PostgreSQL)
- Heroku Postgres
- Self-hosted PostgreSQL

## Troubleshooting

### Extension Won't Load

- Check manifest.json syntax
- Ensure all files exist
- Check Chrome DevTools console
- Try restarting Chrome

### Backend Connection Errors

- Verify server is running
- Check firewall settings
- Verify DATABASE_URL
- Check CORS configuration

### Data Not Uploading

- Check internet connection
- Verify API endpoint in background.js
- Check browser console for errors
- Examine backend logs

See component READMEs for detailed troubleshooting.

## Research Publications

If you use this platform in your research, please cite:

```
[Your Research Paper]
[Authors] (2025)
[Publication]
```

## Support

### Research Team

**Principal Investigator**: [NAME]
**Email**: research@university.edu
**Website**: [URL]

### Technical Support

**GitHub Issues**: [Repository URL]/issues
**Email**: tech@university.edu

### IRB Questions

**IRB Office**: [IRB EMAIL]
**Protocol**: [IRB PROTOCOL NUMBER]

## License

MIT License - See [LICENSE](LICENSE) file

## Acknowledgments

- Research participants
- IRB office
- Development team
- Funding sources

## Related Projects

- [SE Ranking API Tools](seranking/README.md) - SEO and backlink analysis tools in this repository

---

**Version**: 1.0.0
**Last Updated**: January 2025
**Status**: Active Development
