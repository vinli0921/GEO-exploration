/**
 * Popup UI Controller
 * Handles user interactions and extension state management
 */

// DOM Elements
const consentSection = document.getElementById('consentSection');
const recordingSection = document.getElementById('recordingSection');
const participantIdInput = document.getElementById('participantId');
const consentCheckbox = document.getElementById('consentCheckbox');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const sessionIdDisplay = document.getElementById('sessionId');
const displayParticipantId = document.getElementById('displayParticipantId');
const eventCountDisplay = document.getElementById('eventCount');
const durationDisplay = document.getElementById('duration');
const settingsHeader = document.getElementById('settingsHeader');
const settingsContent = document.getElementById('settingsContent');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const serverUrlInput = document.getElementById('serverUrl');
const excludedDomainsInput = document.getElementById('excludedDomains');

// State
let startTime = null;
let durationInterval = null;

/**
 * Initialize popup
 */
async function init() {
  // Load saved settings
  const settings = await chrome.storage.local.get([
    'isRecording',
    'participantId',
    'consentGiven',
    'serverUrl',
    'excludedDomains',
    'currentSessionId'
  ]);

  // Populate settings
  if (settings.serverUrl) {
    serverUrlInput.value = settings.serverUrl;
  }
  if (settings.excludedDomains) {
    excludedDomainsInput.value = settings.excludedDomains.join('\n');
  }

  // Check if already recording
  if (settings.isRecording) {
    const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    showRecordingSection(settings);
    startDurationTimer(status.startTime);
  } else if (settings.consentGiven && settings.participantId) {
    // Pre-fill participant ID if consent was previously given
    participantIdInput.value = settings.participantId;
    consentCheckbox.checked = true;
    startBtn.disabled = false;
  }

  // Setup event listeners
  setupEventListeners();

  // Update status periodically
  setInterval(updateStatus, 1000);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Enable start button when consent is given
  consentCheckbox.addEventListener('change', () => {
    const hasParticipantId = participantIdInput.value.trim().length > 0;
    startBtn.disabled = !(consentCheckbox.checked && hasParticipantId);
  });

  participantIdInput.addEventListener('input', () => {
    const hasParticipantId = participantIdInput.value.trim().length > 0;
    startBtn.disabled = !(consentCheckbox.checked && hasParticipantId);
  });

  // Start recording
  startBtn.addEventListener('click', handleStartRecording);

  // Pause recording
  pauseBtn.addEventListener('click', handlePauseRecording);

  // Stop recording
  stopBtn.addEventListener('click', handleStopRecording);

  // Settings collapsible
  settingsHeader.addEventListener('click', () => {
    const isVisible = settingsContent.style.display !== 'none';
    settingsContent.style.display = isVisible ? 'none' : 'block';
    settingsHeader.textContent = isVisible ? 'Advanced Settings ▼' : 'Advanced Settings ▲';
  });

  // Save settings
  saveSettingsBtn.addEventListener('click', handleSaveSettings);
}

/**
 * Handle start recording
 */
async function handleStartRecording() {
  const participantId = participantIdInput.value.trim();

  if (!participantId) {
    alert('Please enter a participant ID');
    return;
  }

  if (!consentCheckbox.checked) {
    alert('Please agree to the consent form');
    return;
  }

  // Disable button
  startBtn.disabled = true;
  startBtn.textContent = 'Starting...';

  try {
    // Save consent
    await chrome.storage.local.set({
      consentGiven: true,
      participantId: participantId
    });

    // Start recording via background script
    const response = await chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      data: { participantId }
    });

    if (response.success) {
      const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      showRecordingSection({
        participantId,
        currentSessionId: response.sessionId
      });
      startDurationTimer(status.startTime);

      // Notify content scripts to start capturing
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      });
    } else {
      alert('Failed to start recording: ' + response.error);
      startBtn.disabled = false;
      startBtn.textContent = 'Start Recording';
    }
  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Error starting recording. Please try again.');
    startBtn.disabled = false;
    startBtn.textContent = 'Start Recording';
  }
}

/**
 * Handle pause recording
 */
function handlePauseRecording() {
  // TODO: Implement pause functionality
  alert('Pause functionality coming soon');
}

/**
 * Handle stop recording
 */
async function handleStopRecording() {
  if (!confirm('Are you sure you want to stop recording? All data will be uploaded.')) {
    return;
  }

  stopBtn.disabled = true;
  stopBtn.textContent = 'Stopping...';

  try {
    // Stop recording via background script
    const response = await chrome.runtime.sendMessage({
      type: 'STOP_RECORDING'
    });

    if (response.success) {
      // Notify content scripts to stop capturing
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'STOP_CAPTURE' }).catch(() => {});
      });

      // Reset UI
      showConsentSection();
      stopDurationTimer();

      alert('Recording stopped. Thank you for participating!');
    } else {
      alert('Failed to stop recording: ' + response.error);
      stopBtn.disabled = false;
      stopBtn.textContent = 'Stop & Upload';
    }
  } catch (error) {
    console.error('Error stopping recording:', error);
    alert('Error stopping recording. Please try again.');
    stopBtn.disabled = false;
    stopBtn.textContent = 'Stop & Upload';
  }
}

/**
 * Handle save settings
 */
async function handleSaveSettings() {
  const serverUrl = serverUrlInput.value.trim();
  const excludedDomains = excludedDomainsInput.value
    .split('\n')
    .map(d => d.trim())
    .filter(Boolean);

  await chrome.storage.local.set({
    serverUrl,
    excludedDomains
  });

  saveSettingsBtn.textContent = 'Saved!';
  setTimeout(() => {
    saveSettingsBtn.textContent = 'Save Settings';
  }, 2000);
}

/**
 * Show consent section
 */
function showConsentSection() {
  consentSection.style.display = 'block';
  recordingSection.style.display = 'none';
  updateStatusIndicator(false);
}

/**
 * Show recording section
 */
function showRecordingSection(settings) {
  consentSection.style.display = 'none';
  recordingSection.style.display = 'block';

  displayParticipantId.textContent = settings.participantId;
  sessionIdDisplay.textContent = settings.currentSessionId?.substring(0, 12) + '...' || '-';

  updateStatusIndicator(true);
}

/**
 * Update status indicator
 */
function updateStatusIndicator(isRecording) {
  if (isRecording) {
    statusDot.classList.add('recording');
    statusText.textContent = 'Recording Active';
  } else {
    statusDot.classList.remove('recording', 'paused');
    statusText.textContent = 'Not Recording';
  }
}

/**
 * Update status (event count, etc.)
 */
async function updateStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

    if (response && response.isRecording) {
      eventCountDisplay.textContent = response.eventCount || 0;
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Start duration timer
 */
function startDurationTimer(initialStartTime) {
  startTime = initialStartTime || Date.now();

  durationInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    durationDisplay.textContent =
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

/**
 * Stop duration timer
 */
function stopDurationTimer() {
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
  startTime = null;
  durationDisplay.textContent = '00:00:00';
}

// Initialize
init();
