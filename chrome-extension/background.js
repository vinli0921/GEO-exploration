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
  retryDelay: 5000 // 5 seconds
};

// Session state
let sessionState = {
  isRecording: false,
  sessionId: null,
  participantId: null,
  startTime: null,
  eventBuffer: [],
  uploadQueue: []
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
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECORDING':
      handleStartRecording(message.data).then(sendResponse);
      return true;

    case 'STOP_RECORDING':
      handleStopRecording().then(sendResponse);
      return true;

    case 'EVENT_CAPTURED':
      handleEventCaptured(message.data, sender.tab);
      sendResponse({ success: true });
      return true;

    case 'GET_STATUS':
      sendResponse({
        isRecording: sessionState.isRecording,
        sessionId: sessionState.sessionId,
        participantId: sessionState.participantId,
        eventCount: sessionState.eventBuffer.length
      });
      return true;

    case 'UPLOAD_NOW':
      uploadBufferedData().then(sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

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

    // Save to storage
    await chrome.storage.local.set({
      isRecording: true,
      participantId: data.participantId,
      currentSessionId: sessionState.sessionId
    });

    // Log session start event
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
      totalEvents: sessionState.eventBuffer.length
    });

    // Upload remaining data
    await uploadBufferedData();

    // Reset state
    sessionState.isRecording = false;
    sessionState.sessionId = null;
    sessionState.startTime = null;

    await chrome.storage.local.set({
      isRecording: false,
      currentSessionId: null
    });

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
function handleEventCaptured(eventData, tab) {
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

  // Check buffer size and upload if needed
  const bufferSize = JSON.stringify(sessionState.eventBuffer).length;
  if (bufferSize >= CONFIG.maxBufferSize) {
    uploadBufferedData();
  }
}

/**
 * Schedule periodic uploads
 */
function schedulePeriodicUpload() {
  setInterval(() => {
    if (sessionState.isRecording && sessionState.eventBuffer.length > 0) {
      uploadBufferedData();
    }
  }, CONFIG.batchUploadInterval);
}

/**
 * Upload buffered data to server
 */
async function uploadBufferedData() {
  if (sessionState.eventBuffer.length === 0) {
    return { success: true, message: 'No data to upload' };
  }

  const dataToUpload = [...sessionState.eventBuffer];
  sessionState.eventBuffer = []; // Clear buffer

  // Compress data (simple approach - in production use proper compression)
  const payload = {
    sessionId: sessionState.sessionId,
    participantId: sessionState.participantId,
    events: dataToUpload,
    uploadTimestamp: Date.now(),
    eventCount: dataToUpload.length
  };

  // Try to upload with retries
  for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
    try {
      const response = await fetch(CONFIG.uploadEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`Uploaded ${dataToUpload.length} events (attempt ${attempt})`);

        // Update statistics
        const stats = await chrome.storage.local.get('totalEvents');
        await chrome.storage.local.set({
          totalEvents: (stats.totalEvents || 0) + dataToUpload.length
        });

        return { success: true, eventsUploaded: dataToUpload.length };
      } else {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Upload attempt ${attempt} failed:`, error);

      if (attempt < CONFIG.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      } else {
        // Store failed data for later retry
        sessionState.uploadQueue.push(payload);
        return { success: false, error: error.message, queuedForRetry: true };
      }
    }
  }
}

/**
 * Track tab navigation
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!sessionState.isRecording) return;

  if (changeInfo.status === 'complete') {
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
  handleEventCaptured({
    type: 'tab_switch',
    tabId: activeInfo.tabId,
    url: tab.url,
    title: tab.title
  }, tab);
});

console.log('Background service worker loaded');
