# Data Dictionary

## LLM Search Behavior Study - Data Fields Reference

This document describes all data fields collected by the Chrome extension and stored in the database.

---

## Session Data

### Session Record

| Field Name | Type | Description | Example | Required |
|------------|------|-------------|---------|----------|
| `id` | Integer | Database primary key | `1` | Yes |
| `session_id` | String | Unique session identifier | `session_1705315800_abc123` | Yes |
| `participant_id` | String | Participant identifier | `P001` | Yes |
| `started_at` | DateTime | Session start timestamp (UTC) | `2025-01-15T10:30:00Z` | Yes |
| `ended_at` | DateTime | Session end timestamp (UTC) | `2025-01-15T11:30:00Z` | No |
| `duration_seconds` | Integer | Total session duration in seconds | `3600` | No |
| `user_agent` | String | Browser user agent string | `Mozilla/5.0 Chrome/...` | No |
| `timezone` | String | User timezone | `America/New_York` | No |
| `screen_width` | Integer | Screen width in pixels | `1920` | No |
| `screen_height` | Integer | Screen height in pixels | `1080` | No |
| `total_events` | Integer | Total number of events captured | `1250` | Yes |
| `total_pages` | Integer | Number of unique pages visited | `15` | Yes |
| `is_active` | Boolean | Whether session is currently active | `true` | Yes |
| `is_complete` | Boolean | Whether session ended properly | `false` | Yes |

---

## Event Data

### Common Event Fields

These fields are present in ALL event types:

| Field Name | Type | Description | Example | Required |
|------------|------|-------------|---------|----------|
| `type` | String | Event type identifier | `click`, `page_load` | Yes |
| `timestamp` | Integer | Unix timestamp in milliseconds | `1705315800000` | Yes |
| `sessionId` | String | Associated session ID | `session_1705315800_abc123` | Yes |
| `participantId` | String | Associated participant ID | `P001` | Yes |
| `url` | String | Current page URL | `https://example.com` | No |
| `title` | String | Current page title | `Example Page` | No |
| `tabId` | Integer | Browser tab identifier | `12345` | No |

### Event Types

#### 1. session_start

Recorded when a participant starts recording.

**Additional Fields:**
- `userAgent` (String): Browser user agent
- `timezone` (String): User timezone
- `screen` (Object): Screen dimensions
  - `width` (Integer): Screen width in pixels
  - `height` (Integer): Screen height in pixels

**Example:**
```json
{
  "type": "session_start",
  "timestamp": 1705315800000,
  "sessionId": "session_1705315800_abc123",
  "participantId": "P001",
  "userAgent": "Mozilla/5.0 ...",
  "timezone": "America/New_York",
  "screen": {
    "width": 1920,
    "height": 1080
  }
}
```

#### 2. session_end

Recorded when a participant stops recording.

**Additional Fields:**
- `duration` (Integer): Total session duration in milliseconds
- `totalEvents` (Integer): Total events in session

**Example:**
```json
{
  "type": "session_end",
  "timestamp": 1705319400000,
  "sessionId": "session_1705315800_abc123",
  "duration": 3600000,
  "totalEvents": 1250
}
```

#### 3. page_load

Recorded when a new page loads.

**Additional Fields:**
- `url` (String): Page URL
- `title` (String): Page title
- `referrer` (String): Referring page URL
- `viewport` (Object): Viewport dimensions
  - `width` (Integer): Viewport width
  - `height` (Integer): Viewport height
- `performance` (Object): Page load performance
  - `loadTime` (Integer): Total load time in ms
  - `domContentLoaded` (Integer): DOM ready time in ms

**Example:**
```json
{
  "type": "page_load",
  "timestamp": 1705315810000,
  "url": "https://www.google.com",
  "title": "Google",
  "referrer": "https://example.com",
  "viewport": {
    "width": 1920,
    "height": 937
  },
  "performance": {
    "loadTime": 1250,
    "domContentLoaded": 850
  }
}
```

#### 4. click

Recorded when user clicks an element.

**Additional Fields:**
- `element` (Object): Clicked element information
  - `tag` (String): HTML tag name
  - `id` (String): Element ID
  - `classes` (String): CSS classes
  - `text` (String): Element text content (truncated)
  - `href` (String): Link URL (if applicable)
  - `selector` (String): CSS selector
- `coordinates` (Object): Click coordinates
  - `x` (Integer): Viewport X coordinate
  - `y` (Integer): Viewport Y coordinate
  - `pageX` (Integer): Page X coordinate
  - `pageY` (Integer): Page Y coordinate

**Example:**
```json
{
  "type": "click",
  "timestamp": 1705315815000,
  "element": {
    "tag": "a",
    "id": "search-button",
    "classes": "btn btn-primary",
    "text": "Search",
    "href": "https://example.com/search",
    "selector": "a#search-button.btn"
  },
  "coordinates": {
    "x": 150,
    "y": 200,
    "pageX": 150,
    "pageY": 450
  }
}
```

#### 5. scroll

Recorded when user scrolls the page.

**Additional Fields:**
- `position` (Object): Scroll position
  - `x` (Integer): Horizontal scroll position
  - `y` (Integer): Vertical scroll position
- `percentage` (Object): Scroll percentage
  - `x` (Float): Horizontal scroll percentage
  - `y` (Float): Vertical scroll percentage

**Example:**
```json
{
  "type": "scroll",
  "timestamp": 1705315820000,
  "position": {
    "x": 0,
    "y": 1250
  },
  "percentage": {
    "x": 0,
    "y": 45.5
  }
}
```

#### 6. input

Recorded when user types in an input field.

**Additional Fields:**
- `element` (Object): Input element information
  - `tag` (String): HTML tag name
  - `id` (String): Element ID
  - `name` (String): Element name attribute
  - `type` (String): Input type
  - `selector` (String): CSS selector
- `value` (String): Input value (only for search fields, else `[REDACTED]`)
- `valueLength` (Integer): Length of input value
- `isSearch` (Boolean): Whether this is a search input

**Example:**
```json
{
  "type": "input",
  "timestamp": 1705315825000,
  "element": {
    "tag": "input",
    "id": "search-query",
    "name": "q",
    "type": "text",
    "selector": "input#search-query"
  },
  "value": "best running shoes 2025",
  "valueLength": 23,
  "isSearch": true
}
```

#### 7. form_submit

Recorded when a form is submitted.

**Additional Fields:**
- `form` (Object): Form information
  - `id` (String): Form ID
  - `action` (String): Form action URL
  - `method` (String): Form method (GET/POST)

**Example:**
```json
{
  "type": "form_submit",
  "timestamp": 1705315830000,
  "form": {
    "id": "search-form",
    "action": "https://www.google.com/search",
    "method": "GET"
  }
}
```

#### 8. navigation

Recorded on tab navigation events.

**Additional Fields:**
- `url` (String): New URL
- `title` (String): New page title
- `changeInfo` (Object): Navigation change information

**Example:**
```json
{
  "type": "navigation",
  "timestamp": 1705315835000,
  "url": "https://www.example.com/page2",
  "title": "Example Page 2",
  "changeInfo": {
    "status": "complete"
  }
}
```

#### 9. tab_switch

Recorded when user switches between tabs.

**Additional Fields:**
- `tabId` (Integer): New active tab ID
- `url` (String): Tab URL
- `title` (String): Tab title

#### 10. window_focus / window_blur

Recorded when browser window gains or loses focus.

**No additional fields.**

#### 11. visibility_change

Recorded when page visibility changes.

**Additional Fields:**
- `hidden` (Boolean): Whether page is now hidden

#### 12. dom_snapshot

Recorded on initial page load with simplified DOM structure.

**Additional Fields:**
- `meta` (Object): Page metadata
- `structure` (Object): Simplified DOM tree
- `forms` (Array): Forms on page
- `links` (Array): Links on page (max 100)
- `images` (Array): Images on page (max 50)

#### 13. dom_mutation

Recorded when significant DOM changes occur.

**Additional Fields:**
- `mutationCount` (Integer): Number of mutations
- `addedNodes` (Integer): Number of nodes added
- `removedNodes` (Integer): Number of nodes removed

---

## Upload Data

### Upload Record

| Field Name | Type | Description | Example | Required |
|------------|------|-------------|---------|----------|
| `id` | Integer | Database primary key | `1` | Yes |
| `session_id` | Integer | Foreign key to session | `1` | Yes |
| `upload_timestamp` | DateTime | When data was uploaded (UTC) | `2025-01-15T10:35:00Z` | Yes |
| `event_count` | Integer | Number of events in upload | `50` | Yes |
| `data_size_bytes` | Integer | Size of uploaded data | `125000` | No |
| `file_path` | String | Path to stored JSON file | `/data/sessions/P001/...` | No |
| `is_compressed` | Boolean | Whether file is compressed | `true` | Yes |
| `is_processed` | Boolean | Whether upload is processed | `true` | Yes |
| `processed_at` | DateTime | When upload was processed | `2025-01-15T10:35:05Z` | No |

---

## Data Analysis Guidelines

### Privacy Considerations

When analyzing data:
1. Always use participant IDs, never attempt to identify participants
2. Redact any accidental PII found in URLs or page titles
3. Aggregate data when reporting (minimum cell sizes)
4. Do not attempt to link data across studies or datasets

### Data Quality

Check for:
- Duplicate events (use timestamp + session + type)
- Incomplete sessions (missing session_end)
- Outliers (unusual event counts, durations)
- Browser/device biases

### Recommended Analyses

- **Search Behavior**: Compare queries on LLMs vs. search engines
- **Dwell Time**: Time spent on different types of pages
- **Click Patterns**: Click depth, navigation paths
- **Decision Funnels**: Page sequences leading to decisions
- **Query Evolution**: How queries change within sessions

---

## File Storage Format

### Raw Data Files

Location: `data/sessions/{participant_id}/{session_id}/upload_{upload_id}_{timestamp}.json.gz`

Format: Compressed JSON

Structure:
```json
{
  "sessionId": "session_1705315800_abc123",
  "participantId": "P001",
  "events": [ /* array of event objects */ ],
  "uploadTimestamp": 1705315800000,
  "eventCount": 50
}
```

---

## Version History

- **v1.0** (January 2025): Initial data dictionary
