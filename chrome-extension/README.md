# LLM Search Behavior Tracker - Chrome Extension

Chrome extension for tracking user behavior in LLM search studies.

## Features

- **Full Session Recording**: Captures DOM snapshots, user interactions, and page events
- **All-Website Tracking**: Monitors behavior across all browsing sessions
- **Hybrid Storage**: Local buffering with periodic batch uploads
- **IRB Compliant**: Built-in consent forms and privacy controls
- **Privacy Features**: Exclude domains, pause/resume, data review

## Project Structure

```
chrome-extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── background.js           # Service worker for session management
├── scripts/
│   ├── content.js         # Injected script for event capture
│   └── recorder.js        # Session recording engine (TODO)
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup controller
├── storage/
│   └── indexeddb.js       # IndexedDB wrapper for local storage
├── icons/
│   ├── icon16.png         # Extension icons (TODO)
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Installation (Development)

1. **Generate icons** (required):
   ```bash
   # Create placeholder icons or use a design tool
   # Required sizes: 16x16, 48x48, 128x128
   ```

2. **Load extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Configure backend server**:
   - Update the server URL in popup settings
   - Default: `http://localhost:5000`

## Usage

### For Participants

1. Click the extension icon in Chrome toolbar
2. Read the informed consent
3. Enter your participant ID
4. Check the consent checkbox
5. Click "Start Recording"
6. Browse normally - data is captured automatically
7. Click "Stop & Upload" when finished

### For Researchers

1. Deploy the backend server (see `backend-server/README.md`)
2. Distribute the extension to participants
3. Participants complete their browsing sessions
4. Access the admin dashboard to view and export data

## Data Collected

- **Page Events**: Page loads, navigation, visibility changes
- **User Interactions**: Clicks, scrolls, form inputs
- **DOM Snapshots**: Initial page structure and mutations
- **Search Queries**: Extracted from search engines and LLM interfaces
- **Timing Data**: Dwell time, interaction timestamps
- **Tab Management**: Tab switches, focus events

## Privacy & Compliance

- Participant consent required before recording
- Data anonymized using participant IDs
- Sensitive inputs redacted (except search queries)
- Option to exclude specific domains
- Local buffering before upload
- Participants can pause/stop at any time

## Configuration

### Storage Settings

- **Batch Upload Interval**: 5 minutes (configurable in `background.js`)
- **Max Buffer Size**: 10MB
- **Retry Attempts**: 3
- **Local Storage Retention**: 7 days for uploaded data

### Privacy Settings

- **Excluded Domains**: Configure in popup settings
- **Data Review**: Review data before upload (TODO)
- **Pause/Resume**: Temporarily pause recording (TODO)

## Development

### Dependencies

- None! This extension uses vanilla JavaScript and browser APIs only

### Building

No build step required - the extension runs directly from source.

### Testing

1. Load the extension in Chrome
2. Open Chrome DevTools
3. Check Console for logs
4. Test each interaction type
5. Verify data in backend server

### Adding New Event Types

1. Edit `scripts/content.js`
2. Add event listener in `setupEventListeners()`
3. Create handler function
4. Call `sendEvent()` with event data

## Troubleshooting

### Extension Not Loading

- Check `manifest.json` syntax
- Ensure all file paths are correct
- Check Chrome DevTools console for errors

### Events Not Captured

- Check if recording is active (popup status indicator)
- Verify content script is injected (DevTools sources tab)
- Check background service worker logs

### Upload Failures

- Verify backend server is running
- Check server URL in settings
- Review network tab in DevTools
- Check CORS configuration on server

## Known Limitations

- **Manifest V3**: Some limitations vs V2 (persistent background pages)
- **Cross-origin iframes**: Cannot capture events in cross-origin frames
- **Dynamic content**: Heavy SPAs may miss some mutations
- **Performance**: Recording on complex pages may impact performance

## TODO

- [ ] Create extension icons (16x16, 48x48, 128x128)
- [ ] Implement pause/resume functionality
- [ ] Add data review before upload
- [ ] Implement compression for events
- [ ] Add recorder.js for advanced session replay
- [ ] Add export to local file option
- [ ] Add real-time preview of captured data
- [ ] Optimize performance for heavy pages

## IRB Documentation

IRB materials are available in `/docs/`:

- Consent form template
- Privacy policy
- Data dictionary
- Participant instructions

## License

MIT License - See LICENSE file

## Contact

For questions or issues:
- Email: research@university.edu
- IRB Protocol #: XXXXX

## Citation

If you use this tool in your research, please cite:

```
[Your Research Paper]
[Authors] (2025)
[Publication]
```
