# Chrome Extension - LLM Search Behavior Tracker

Chrome extension for tracking user browsing behavior in research studies.

## Features

- Full session recording with DOM snapshots and event capture
- Tracks clicks, scrolls, inputs, navigation, and page events
- Search query extraction from Google, ChatGPT, and other LLMs
- Local buffering with batch uploads every 5 minutes
- Privacy controls (exclude domains, pause/resume)
- IRB-compliant consent flow
- Works across all websites

## Installation

### For Participants (Development/Testing)

1. Download or clone the extension folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder
6. Extension icon should appear in toolbar

### For Distribution

**Option 1: ZIP File Distribution**

```bash
cd chrome-extension
zip -r llm-search-tracker.zip . -x "*.DS_Store"
```

Send ZIP file to participants with installation instructions.

**Option 2: Chrome Web Store**

1. Create Chrome Developer account ($5 one-time fee)
2. Generate PNG icons (see Icons section below)
3. Package extension as ZIP
4. Upload to Chrome Web Store
5. Submit for review

## Configuration

### Backend URL

Update API endpoint in `background.js` (line 10):

```javascript
const CONFIG = {
  uploadEndpoint: 'https://geo-exploration-backend.vercel.app/api/sessions/upload',
  // ...
};
```

**Development**: Use `http://localhost:5000/api/sessions/upload`
**Production**: Use your deployed Vercel URL

### Upload Settings

Configure in `background.js`:

```javascript
const CONFIG = {
  batchUploadInterval: 5 * 60 * 1000,  // 5 minutes
  maxBufferSize: 10 * 1024 * 1024,     // 10MB
  retryAttempts: 3,
  retryDelay: 5000                      // 5 seconds
};
```

## Usage

### Starting a Session

1. Click extension icon in toolbar
2. Read informed consent
3. Enter participant ID (provided by researcher)
4. Check consent checkbox
5. Click "Start Recording"

### During Recording

- Browse normally - extension runs in background
- Green dot indicates active recording
- Data is buffered locally and uploaded every 5 minutes
- Can pause/stop recording at any time

### Stopping a Session

1. Click extension icon
2. Click "Stop & Upload"
3. Wait for upload confirmation
4. Uninstall extension when study is complete

## Privacy Features

### Excluded Domains

Participants can exclude sensitive websites:

1. Click extension icon
2. Click "Advanced Settings"
3. Enter domains to exclude (one per line):
```
mybank.com
healthcare.org
```
4. Click "Save Settings"

### Data Redaction

- Passwords and payment fields are automatically redacted
- Most input fields show `[REDACTED]` instead of actual value
- Only search query inputs capture actual text
- No incognito/private browsing data is collected

### Pause Recording

Participants can temporarily pause without stopping:
1. Click extension icon
2. Click "Pause" button
3. Resume when ready

## Data Collected

**Page Events:**
- Page loads (URL, title, referrer)
- Navigation (forward, back, tab switches)
- Visibility changes (tab focus/blur)

**User Interactions:**
- Clicks (element, coordinates)
- Scrolls (position, percentage)
- Input events (type, length, search queries)
- Form submissions

**DOM Snapshots:**
- Initial page structure (simplified)
- Metadata (meta tags)
- Links and images (first 100/50)
- Forms (field types only)

**Timing Data:**
- Timestamps for all events
- Dwell time on pages
- Session duration

**Browser Context:**
- User agent
- Screen size
- Timezone
- Tab IDs

## Icons

Current implementation uses placeholder SVG icons. For production distribution:

### Generate PNG Icons

Required sizes: 16x16, 48x48, 128x128

**Using ImageMagick:**
```bash
cd icons
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

**Using Online Tools:**
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

## File Structure

```
chrome-extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── background.js           # Service worker (session management)
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup controller
├── scripts/
│   └── content.js         # Content script (event capture)
├── storage/
│   └── indexeddb.js       # IndexedDB wrapper (not currently used)
└── icons/
    ├── icon.svg           # Placeholder SVG
    └── README.md          # Icon generation instructions
```

## Customization

### Update Consent Form

Edit `popup/popup.html` (lines 25-35) to customize:
- Study purpose
- Data collected
- IRB information
- Contact details

### Update Branding

1. Replace icons in `icons/` folder
2. Update extension name in `manifest.json`
3. Customize colors in `popup/popup.css`

### Add Excluded Domains by Default

Edit `background.js` to pre-configure excluded domains:

```javascript
await chrome.storage.local.set({
  excludedDomains: ['banking.com', 'healthcare.org'],
  // ...
});
```

## Testing

### Test Locally

1. Load unpacked extension
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Filter by "extension" or "LLM Search"
5. Record a test session
6. Check for:
   - "Recording started" message
   - Event capture logs
   - Upload success messages

### Test Event Capture

1. Visit different websites
2. Perform various actions (click, scroll, type)
3. Check console for event capture logs
4. Verify events in backend/dashboard

### Test Upload

1. Record a short session
2. Wait 5 minutes for auto-upload OR
3. Stop recording to trigger immediate upload
4. Check console for upload status
5. Verify data appears in admin dashboard

## Troubleshooting

**Extension Won't Load**
- Check manifest.json syntax
- Ensure all referenced files exist
- Check Chrome version (requires v88+)
- Try restarting Chrome

**Events Not Captured**
- Check if recording is active (green dot)
- Verify content script injected (DevTools > Sources)
- Check for JavaScript errors in console
- Try reloading the page

**Upload Fails**
- Verify backend URL in background.js
- Check backend is deployed and running
- Check network tab for failed requests
- Verify CORS is enabled on backend
- Check internet connection

**High Memory Usage**
- Reduce batchUploadInterval (upload more frequently)
- Reduce maxBufferSize
- Check for memory leaks in DevTools

## Known Limitations

**Manifest V3:**
- No persistent background pages (service workers only)
- Some APIs limited compared to V2

**Cross-Origin Iframes:**
- Cannot capture events inside iframes from different domains
- Browser security restriction

**Heavy SPAs:**
- May miss some DOM mutations on complex single-page apps
- Mutation observer throttled to reduce overhead

**Incognito Mode:**
- Extension does not run in incognito windows
- By design for privacy

## Performance

Extension is optimized to minimize impact:
- Event listeners use capture phase
- Scroll/mousemove events throttled
- DOM snapshots simplified (structure only)
- Data compressed before upload
- Batch uploads reduce network overhead

Typical overhead: <1% CPU, <50MB memory

## Security

**Data Protection:**
- HTTPS required for uploads
- Passwords/payments auto-redacted
- Participant control over excluded sites
- Local buffering before upload
- No data collection in incognito mode

**Permissions:**
- `storage`: Local data buffering
- `tabs`: Tab management
- `webNavigation`: Navigation tracking
- `activeTab`: Current tab access
- `scripting`: Content script injection
- `<all_urls>`: Access all websites (required for study)

## Participant Instructions

See `docs/PARTICIPANT_INSTRUCTIONS.md` for detailed participant-facing documentation.

## IRB Compliance

Extension includes:
- Informed consent display
- Explicit opt-in requirement
- Participant ID collection
- Privacy controls
- Data review capability

See `docs/` folder for complete IRB templates.

## Support

For issues or questions:
- Check console for error messages
- Review backend logs
- Contact research team: research@university.edu
