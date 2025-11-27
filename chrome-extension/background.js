/**
 * Background Service Worker for LLM Search Behavior Tracker
 * Handles session management, data buffering, and batch uploads
 */

// Configuration
const CONFIG = {
  batchUploadInterval: 5 * 60 * 1000, // 5 minutes
  maxBufferSize: 10 * 1024 * 1024, // 10MB
  uploadEndpoint: 'https://geo-exploration-backend.vercel.app/api/sessions/upload',
  retryAttempts: 3,
  retryDelay: 5000, // 5 seconds
  DEBUG: true // Set to true to log sensitive event data (URLs, queries, titles)
};

// Session state
let sessionState = {
  isRecording: false,
  sessionId: null,
  participantId: null,
  startTime: null,
  eventBuffer: [],
  uploadQueue: [],
  excludedDomains: [],  // Domains opted out of tracking
  _restored: false,
  totalSessionEvents: 0  // Track total events across all uploads
};

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('LLM Search Behavior Tracker installed');

  // Initialize storage with default values
  await chrome.storage.local.set({
    isRecording: false,
    participantId: null,
    consentGiven: false,
    excludedDomains: [],
    totalEvents: 0,
    sessions: []
  });
});

/**
 * Restore session state from storage (handles service worker restart)
 */
async function restoreSessionState() {
  const stored = await chrome.storage.local.get([
    'isRecording',
    'recordingStartTime',
    'currentSessionId',
    'participantId',
    'eventBuffer',
    'uploadQueue',
    'pendingUploads',
    'totalSessionEvents',
    'excludedDomains'
  ]);

  if (stored.isRecording && stored.recordingStartTime) {
    sessionState.isRecording = true;
    sessionState.startTime = stored.recordingStartTime;
    sessionState.sessionId = stored.currentSessionId;
    sessionState.participantId = stored.participantId;
    sessionState.eventBuffer = stored.eventBuffer || [];
    sessionState.uploadQueue = stored.uploadQueue || [];
    sessionState.totalSessionEvents = stored.totalSessionEvents || 0;
    sessionState.excludedDomains = stored.excludedDomains || [];

    // Restore pending uploads
    if (stored.pendingUploads && stored.pendingUploads.length > 0) {
      stored.pendingUploads.forEach(upload => {
        uploadInProgress.set(upload.uploadId, upload);
      });
    }

    // CRITICAL: Re-schedule periodic uploads
    schedulePeriodicUpload();

    console.log('Session restored:', {
      sessionId: sessionState.sessionId,
      events: sessionState.eventBuffer.length,
      totalEvents: sessionState.totalSessionEvents,
      pending: uploadInProgress.size
    });
  }
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Restore ONLY ONCE per service worker restart
  if (!sessionState._restored) {
    restoreSessionState().then(() => {
      sessionState._restored = true;
      handleMessage(message, sender, sendResponse);
    });
    return true;
  }

  handleMessage(message, sender, sendResponse);
  return true;
});

/**
 * Handle individual message types
 */
function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'START_RECORDING':
      handleStartRecording(message.data).then(sendResponse);
      break;

    case 'STOP_RECORDING':
      handleStopRecording().then(sendResponse);
      break;

    case 'EVENT_CAPTURED':
      handleEventCaptured(message.data, sender.tab);
      sendResponse({ success: true });
      break;

    case 'GET_STATUS':
      sendResponse({
        isRecording: sessionState.isRecording,
        sessionId: sessionState.sessionId,
        participantId: sessionState.participantId,
        eventCount: sessionState.eventBuffer.length,
        startTime: sessionState.startTime
      });
      break;

    case 'UPLOAD_NOW':
      uploadBufferedData().then(sendResponse);
      break;

    case 'FORCE_RESET':
      // Force reset recording state (for debugging stuck sessions)
      sessionState.isRecording = false;
      sessionState.sessionId = null;
      sessionState.participantId = null;
      sessionState.startTime = null;
      sessionState.eventBuffer = [];
      chrome.alarms.clear(ALARM_NAME);
      chrome.storage.local.set({
        isRecording: false,
        currentSessionId: null,
        recordingStartTime: null
      }).then(() => {
        console.log('Recording state forcefully reset');
        sendResponse({ success: true, message: 'State reset successfully' });
      });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

/**
 * Start a new recording session
 */
async function handleStartRecording(data) {
  try {
    // Generate session ID
    sessionState.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionState.participantId = data.participantId;
    sessionState.startTime = Date.now();
    sessionState.isRecording = true;
    sessionState.eventBuffer = [];
    sessionState.totalSessionEvents = 0;  // Reset counter for new session

    // Save to storage
    await chrome.storage.local.set({
      isRecording: true,
      participantId: data.participantId,
      currentSessionId: sessionState.sessionId,
      recordingStartTime: sessionState.startTime,
      totalSessionEvents: 0
    });

    // Log session start event
    //TODO: session state might be when chrome extension is opened
    sessionState.eventBuffer.push({
      type: 'session_start',
      timestamp: sessionState.startTime,
      sessionId: sessionState.sessionId,
      participantId: sessionState.participantId,
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Start periodic upload
    schedulePeriodicUpload();

    console.log('Recording started:', sessionState.sessionId);
    return { success: true, sessionId: sessionState.sessionId };
  } catch (error) {
    console.error('Error starting recording:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Stop the current recording session
 */
async function handleStopRecording() {
  try {
    if (!sessionState.isRecording) {
      return { success: false, error: 'No active recording' };
    }

    // Log session end event
    sessionState.eventBuffer.push({
      type: 'session_end',
      timestamp: Date.now(),
      sessionId: sessionState.sessionId,
      duration: Date.now() - sessionState.startTime,
      totalEvents: sessionState.totalSessionEvents + 1  // +1 for this session_end event itself
    });

    // Upload remaining data
    await uploadBufferedData();

    // Reset state
    sessionState.isRecording = false;
    sessionState.sessionId = null;
    sessionState.startTime = null;

    await chrome.storage.local.set({
      isRecording: false,
      currentSessionId: null,
      recordingStartTime: null
    });

    // Clear periodic upload alarm
    chrome.alarms.clear(ALARM_NAME);

    console.log('Recording stopped');
    return { success: true };
  } catch (error) {
    console.error('Error stopping recording:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle captured events from content scripts
 */
async function handleEventCaptured(eventData, tab) {
  if (!sessionState.isRecording) return;

  // Add metadata
  const enrichedEvent = {
    ...eventData,
    sessionId: sessionState.sessionId,
    participantId: sessionState.participantId,
    tabId: tab?.id,
    url: tab?.url,
    title: tab?.title,
    timestamp: Date.now()
  };

  // Add to buffer
  sessionState.eventBuffer.push(enrichedEvent);

  // Increment total session events counter
  sessionState.totalSessionEvents++;

  // Persist buffer to storage
  await chrome.storage.local.set({
    eventBuffer: sessionState.eventBuffer,
    totalSessionEvents: sessionState.totalSessionEvents
  });

  // Check buffer size and upload if needed
  const bufferSize = JSON.stringify(sessionState.eventBuffer).length;
  if (bufferSize >= CONFIG.maxBufferSize) {
    uploadBufferedData();
  }
}

/**
 * Upload tracking to prevent data loss
 */
let uploadInProgress = new Map(); // uploadId -> { events, startTime, sessionId, participantId }

function generateUploadId() {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function savePendingUploads() {
  const pendingData = Array.from(uploadInProgress.entries()).map(([id, data]) => ({
    uploadId: id,
    ...data
  }));
  await chrome.storage.local.set({ pendingUploads: pendingData });
}

/**
 * Schedule periodic uploads using chrome.alarms
 */
const ALARM_NAME = 'PERIODIC_UPLOAD_ALARM';

function schedulePeriodicUpload() {
  // Clear any existing alarm first
  chrome.alarms.clear(ALARM_NAME, (wasCleared) => {
    console.log('Previous alarm cleared:', wasCleared);
  });

  // Create alarm (fires first time after 5 minutes, then repeats every 5 minutes)
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 5,
    periodInMinutes: 5
  });

  console.log('Periodic upload alarm scheduled - will fire in 5 minutes');

  // Verify alarm was created
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (alarm) {
      console.log('Alarm confirmed:', alarm);
    } else {
      console.error('Failed to create alarm!');
    }
  });
}

/**
 * Upload buffered data to server
 */
async function uploadBufferedData() {
  if (sessionState.eventBuffer.length === 0) {
    return { success: true, message: 'No data to upload' };
  }

  // Create batch ID and copy data
  const batchId = generateUploadId();
  const dataToUpload = [...sessionState.eventBuffer];

  // Track as pending (DO NOT clear buffer yet)
  uploadInProgress.set(batchId, {
    events: dataToUpload,
    startTime: Date.now(),
    sessionId: sessionState.sessionId,
    participantId: sessionState.participantId
  });
  await savePendingUploads();

  const payload = {
    uploadId: batchId,
    sessionId: sessionState.sessionId,
    participantId: sessionState.participantId,
    events: dataToUpload,
    uploadTimestamp: Date.now(),
    eventCount: dataToUpload.length
  };

  // Log upload metadata
  if (CONFIG.DEBUG) {
    // Debug mode: log full payload including sensitive event data
    console.log('[Background] Upload payload (DEBUG):', {
      sessionId: payload.sessionId,
      participantId: payload.participantId,
      eventCount: payload.eventCount,
      sampleEvent: payload.events[0] // Includes URLs, queries, titles
    });
  } else {
    // Production mode: log only non-sensitive metadata
    console.log('[Background] Uploading batch:', {
      sessionId: payload.sessionId,
      participantId: payload.participantId,
      eventCount: payload.eventCount
    });
  }

  // Upload with retries
  for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
    try {
      const response = await fetch(CONFIG.uploadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // ONLY NOW clear buffer after success
        sessionState.eventBuffer = sessionState.eventBuffer.filter(
          e => !dataToUpload.includes(e)
        );

        // Remove from pending and persist
        uploadInProgress.delete(batchId);
        await savePendingUploads();
        await chrome.storage.local.set({
          eventBuffer: sessionState.eventBuffer
        });

        // Update statistics
        const stats = await chrome.storage.local.get('totalEvents');
        await chrome.storage.local.set({
          totalEvents: (stats.totalEvents || 0) + dataToUpload.length,
          lastUploadTimestamp: Date.now()
        });

        console.log(`Uploaded ${dataToUpload.length} events (attempt ${attempt})`);
        return { success: true, eventsUploaded: dataToUpload.length, batchId };
      } else {
        // Try to get error details from response body
        let errorDetails = response.statusText;
        try {
          const errorBody = await response.json();
          errorDetails = JSON.stringify(errorBody);
          console.error('[Background] Server error response:', errorBody);
        } catch (e) {
          // Response body not JSON, use status text
        }
        throw new Error(`Upload failed: ${response.status} - ${errorDetails}`);
      }
    } catch (error) {
      console.error(`Upload attempt ${attempt} failed:`, error);

      if (attempt < CONFIG.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      } else {
        // Keep in buffer for retry
        return {
          success: false,
          error: error.message,
          batchId,
          message: 'Events retained in buffer for retry'
        };
      }
    }
  }
}

/**
 * Listen for storage changes to update excluded domains
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.excludedDomains) {
    sessionState.excludedDomains = changes.excludedDomains.newValue || [];
    console.log('[Background] Updated excluded domains:', sessionState.excludedDomains);
  }
});

/**
 * Check if a URL should be excluded from tracking
 */
function isUrlExcluded(url) {
  if (!url || !sessionState.excludedDomains || sessionState.excludedDomains.length === 0) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Check if hostname matches any excluded domain (exact or subdomain match)
    return sessionState.excludedDomains.some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  } catch (e) {
    // Invalid URL, don't exclude
    return false;
  }
}

/**
 * Track tab navigation
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!sessionState.isRecording) return;

  if (changeInfo.status === 'complete') {
    // Skip if URL is excluded from tracking
    if (isUrlExcluded(tab.url)) {
      console.log('[Background] Skipping navigation event for excluded domain:', tab.url);
      return;
    }

    handleEventCaptured({
      type: 'navigation',
      url: tab.url,
      title: tab.title,
      changeInfo: changeInfo
    }, tab);
  }
});

/**
 * Track tab switches
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!sessionState.isRecording) return;

  const tab = await chrome.tabs.get(activeInfo.tabId);

  // Skip if URL is excluded from tracking
  if (isUrlExcluded(tab.url)) {
    console.log('[Background] Skipping tab_switch event for excluded domain:', tab.url);
    return;
  }

  handleEventCaptured({
    type: 'tab_switch',
    tabId: activeInfo.tabId,
    url: tab.url,
    title: tab.title
  }, tab);
});

/**
 * Handle periodic upload alarm
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm fired:', alarm.name, 'at', new Date().toISOString());

  if (alarm.name === ALARM_NAME) {
    console.log('Periodic upload alarm triggered');

    // Restore state first (in case service worker restarted)
    if (!sessionState._restored) {
      console.log('Restoring session state...');
      await restoreSessionState();
      sessionState._restored = true;
    }

    console.log('Recording status:', sessionState.isRecording, 'Buffer size:', sessionState.eventBuffer.length);

    if (sessionState.isRecording && sessionState.eventBuffer.length > 0) {
      console.log('Triggering auto-upload of', sessionState.eventBuffer.length, 'events');
      const result = await uploadBufferedData();
      console.log('Auto-upload result:', result);
    } else if (!sessionState.isRecording) {
      console.log('Not recording, skipping upload');
    } else {
      console.log('Buffer empty, skipping upload');
    }
  }
});

console.log('Background service worker loaded');
