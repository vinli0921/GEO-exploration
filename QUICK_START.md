# Quick Start Guide

Get the LLM Search Behavior Study platform running in 10 minutes.

## Prerequisites

- Google Chrome
- Python 3.11+
- Terminal/Command Prompt

## Step 1: Clone & Install (2 minutes)

```bash
# Clone repository
git clone https://github.com/yourusername/GEO-exploration.git
cd GEO-exploration

# Install Python dependencies
cd backend-server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Step 2: Start Backend (1 minute)

```bash
# Still in backend-server directory
python app.py

# Should see:
# * Running on http://127.0.0.1:5000
```

Keep this terminal open.

## Step 3: Load Chrome Extension (2 minutes)

1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Toggle "Developer mode" ON (top-right)
4. Click "Load unpacked"
5. Navigate to and select `chrome-extension` folder
6. Pin extension to toolbar (click puzzle icon 🧩)

## Step 4: Test Extension (2 minutes)

1. Click extension icon in toolbar
2. Enter participant ID: `TEST001`
3. Check consent box
4. Click "Start Recording"
5. Browse a few websites
6. Click "Stop & Upload"

## Step 5: View Data (2 minutes)

```bash
# New terminal window
cd admin-dashboard
python -m http.server 8080
```

Open browser to `http://localhost:8080`

You should see your test session!

## Step 6: Generate Icons (1 minute - Optional)

The extension uses placeholder SVG icons. For production, generate PNGs:

```bash
# Install ImageMagick (if not installed)
# Mac: brew install imagemagick
# Ubuntu: apt-get install imagemagick
# Windows: Download from imagemagick.org

cd chrome-extension/icons
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

## Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Extension won't load
- Make sure you selected the `chrome-extension` folder (not a ZIP file)
- Check that `manifest.json` exists in the folder
- Enable "Developer mode" in Chrome extensions

### Data not showing in dashboard
- Make sure backend is running (check http://localhost:5000/api/health)
- Check browser console for errors (F12)
- Verify extension uploaded data (check extension popup - event count)

## Next Steps

### For Development

1. Read [Main README](README.md) for full documentation
2. Review [Data Dictionary](docs/DATA_DICTIONARY.md)
3. Explore API endpoints with curl or Postman
4. Modify extension settings as needed

### For IRB Submission

1. Customize [Consent Form](docs/IRB_CONSENT_FORM_TEMPLATE.md)
2. Update [Privacy Policy](docs/PRIVACY_POLICY.md)
3. Prepare [Participant Instructions](docs/PARTICIPANT_INSTRUCTIONS.md)
4. Configure extension with your institution details

### For Production

1. Set up PostgreSQL database
2. Deploy backend to cloud server (AWS, Heroku, etc.)
3. Update API endpoint in extension `background.js`
4. Package extension for distribution
5. Deploy admin dashboard

## Common Tasks

### Reset Database
```bash
cd backend-server
rm llm_search_behavior.db
python app.py  # Will recreate empty database
```

### Export All Data
```bash
# Via API
curl http://localhost:5000/api/sessions/list > all_sessions.json
```

### Update Extension
After making changes to extension code:
1. Go to `chrome://extensions/`
2. Click refresh icon on your extension
3. Reload any open tabs

### Check Logs
```bash
# Backend logs
cd backend-server
tail -f nohup.out  # If running as daemon

# Extension logs
# Open Chrome DevTools (F12)
# Go to Console tab
# Filter by "extension"
```

## Quick Reference

### URLs
- Backend API: `http://localhost:5000/api`
- Admin Dashboard: `http://localhost:8080`
- Extension: `chrome://extensions/`

### Key Files
- Extension manifest: `chrome-extension/manifest.json`
- Backend config: `backend-server/.env`
- API endpoints: `backend-server/api/sessions.py`

### Default Settings
- Upload interval: 5 minutes
- Buffer size: 10MB
- Retry attempts: 3
- Database: SQLite (development)

## Need Help?

- **Documentation**: See README files in each directory
- **Issues**: Check troubleshooting sections
- **Support**: research@university.edu

---

**Total Time**: ~10 minutes
**Difficulty**: Beginner-friendly
**Status**: Ready for development/testing
