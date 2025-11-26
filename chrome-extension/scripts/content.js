/**
 * Content Script - Platform-aware event tracking for GEO research
 * Captures consumer search behavior on AI platforms and e-commerce sites
 */

// State
let isRecording = false;
let observers = [];
let eventListeners = [];
let platformDetector = null;
let currentPlatform = null;
let platformConfig = null;
let pageLoadTime = Date.now();
let lastQuery = '';
let excludedDomains = [];
let scrollMilestonesReached = new Set();

// Configuration
const CAPTURE_CONFIG = {
  captureClicks: true,
  captureInputs: true,
  scrollMilestones: [25, 50, 75, 100] // Track scroll depth milestones
};

// Event filtering rules by platform type
const EVENT_RULES = {
  general: ['page_load', 'navigation', 'click', 'input', 'form_submit', 'scroll_milestone', 'page_unload', 'visibility_change'],
  ai: ['page_load', 'ai_query_input', 'ai_result_click', 'navigation', 'click', 'input', 'form_submit', 'scroll_milestone', 'page_unload', 'visibility_change'],
  ecommerce: ['page_load', 'product_click', 'conversion_action', 'click', 'input', 'form_submit', 'scroll_milestone', 'page_unload', 'navigation', 'visibility_change']
};

/**
 * Initialize content script
 */
(async function init() {
  console.log('[Content] LLM Search Behavior Tracker loaded');

  // Load platform configuration and excluded domains
  await loadPlatformConfig();
  await loadExcludedDomains();

  // Detect current platform (initial detection - may miss Google AI Overview)
  detectCurrentPlatform();

  // Cache AI referrer AFTER platform detector is ready (not before!)
  cacheAIReferrer();

  // Defer detection for DOM-dependent platforms (e.g., Google AI Overview)
  // Run after DOM is ready to catch elements that don't exist at document_start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Content] DOM ready, retrying platform detection');
      retryPlatformDetection();
    });
  } else {
    // DOM already ready, run immediately
    console.log('[Content] DOM already ready, retrying platform detection');
    setTimeout(retryPlatformDetection, 100); // Small delay to ensure elements are rendered
  }

  // Check if recording is active
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response && response.isRecording) {
      startCapturing();
    }
  });

  // Listen for recording state changes
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_CAPTURE') {
      startCapturing();
      sendResponse({ success: true });
    } else if (message.type === 'STOP_CAPTURE') {
      stopCapturing();
      sendResponse({ success: true });
    }
  });

  // Capture initial page load
  capturePageLoad();
})();

/**
 * Load platform configuration from JSON file
 */
async function loadPlatformConfig() {
  try {
    const response = await fetch(chrome.runtime.getURL('config/platforms.json'));
    platformConfig = await response.json();

    // Load PlatformDetector class - MV3 fix: fetch and eval in content script context
    // (injecting via script tag runs in page context, not accessible to content script)
    const scriptResponse = await fetch(chrome.runtime.getURL('scripts/platform-detector.js'));
    const scriptCode = await scriptResponse.text();

    // Execute in content script context
    // Use indirect eval to execute in global scope of content script
    (0, eval)(scriptCode);

    // Initialize detector
    if (typeof PlatformDetector !== 'undefined') {
      platformDetector = new PlatformDetector(platformConfig);
      console.log('[Content] Platform detector initialized with', Object.keys(platformConfig.ai_platforms).length, 'AI platforms and', Object.keys(platformConfig.ecommerce_platforms).length, 'e-commerce platforms');
    } else {
      console.error('[Content] PlatformDetector class not loaded! Detection will fail.');
    }
  } catch (error) {
    console.error('[Content] Failed to load platform config:', error);
  }
}

/**
 * Load excluded domains from storage
 */
async function loadExcludedDomains() {
  try {
    const result = await chrome.storage.local.get('excludedDomains');
    excludedDomains = result.excludedDomains || [];
  } catch (error) {
    console.error('[Content] Failed to load excluded domains:', error);
  }
}

/**
 * Detect current platform
 */
function detectCurrentPlatform() {
  if (!platformDetector) {
    console.warn('[Content] Platform detector not initialized');
    return;
  }

  currentPlatform = platformDetector.detect(
    window.location.href,
    window.location.hostname
  );

  if (currentPlatform) {
    console.log(`[Content] Detected: ${currentPlatform.platform} (${currentPlatform.type})`);
  } else {
    console.log(`[Content] No platform detected for: ${window.location.hostname}`);
    console.log(`[Content] URL: ${window.location.href}`);
  }
}

/**
 * Retry platform detection after DOM is ready
 * This is critical for Google AI Overview detection which requires DOM elements
 */
function retryPlatformDetection() {
  if (!platformDetector) {
    console.warn('[Content] Platform detector not initialized for retry');
    return;
  }

  const previousPlatform = currentPlatform;

  // Re-run detection now that DOM is ready
  currentPlatform = platformDetector.detect(
    window.location.href,
    window.location.hostname
  );

  // Check if platform changed (e.g., null -> google_ai)
  const platformChanged =
    (!previousPlatform && currentPlatform) ||
    (previousPlatform && currentPlatform && previousPlatform.platform !== currentPlatform.platform);

  if (platformChanged) {
    console.log(`[Content] Platform detected after DOM ready: ${currentPlatform.platform} (${currentPlatform.type})`);

    // If we're already recording, set up the platform-specific tracking now
    if (isRecording && currentPlatform) {
      if (currentPlatform.type === 'ai') {
        console.log('[Content] Setting up AI platform tracking (deferred)');
        setupAIPlatformTracking();
      } else if (currentPlatform.type === 'ecommerce') {
        console.log('[Content] Setting up e-commerce platform tracking (deferred)');
        setupEcommercePlatformTracking();
      }
    }
  } else if (!previousPlatform && !currentPlatform) {
    console.log('[Content] Still no platform detected after DOM ready');
  }
}

/**
 * Cache AI referrer in sessionStorage for multi-page journey tracking
 * Must be called AFTER platformDetector is initialized
 */
function cacheAIReferrer() {
  if (!document.referrer || !platformDetector) {
    return;
  }

  try {
    if (platformDetector.isFromAI(document.referrer)) {
      sessionStorage.setItem('hasAIReferrer', 'true');
      console.log('[Content] Cached AI referrer in sessionStorage');
    }
  } catch (e) {
    console.warn('[Content] Failed to cache AI referrer:', e);
  }
}

/**
 * Start capturing events
 */
function startCapturing() {
  if (isRecording) return;
  isRecording = true;

  console.log('[Content] Starting event capture');

  // Detect platform for this page
  detectCurrentPlatform();

  // Setup general event listeners
  setupEventListeners();

  // Setup platform-specific tracking
  if (currentPlatform) {
    if (currentPlatform.type === 'ai') {
      setupAIPlatformTracking();
    } else if (currentPlatform.type === 'ecommerce') {
      setupEcommercePlatformTracking();
    }
  }
}

/**
 * Stop capturing events
 */
function stopCapturing() {
  if (!isRecording) return;
  isRecording = false;

  console.log('[Content] Stopping event capture');

  // Remove all event listeners
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  eventListeners = [];

  // Disconnect observers
  observers.forEach(observer => observer.disconnect());
  observers = [];
}

/**
 * Capture initial page load
 */
function capturePageLoad() {
  pageLoadTime = Date.now();

  sendEvent({
    type: 'page_load',
    url: window.location.href,
    title: document.title,
    referrer: document.referrer,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  });
}

/**
 * Setup general event listeners
 */
function setupEventListeners() {
  // Click events
  if (CAPTURE_CONFIG.captureClicks) {
    addListener(document, 'click', handleClick, true);
  }

  // Input events
  if (CAPTURE_CONFIG.captureInputs) {
    addListener(document, 'input', handleInput, true);
    addListener(document, 'submit', handleSubmit, true);
  }

  // Scroll milestones (instead of continuous scroll tracking)
  if (CAPTURE_CONFIG.scrollMilestones && CAPTURE_CONFIG.scrollMilestones.length > 0) {
    setupScrollMilestones();
  }

  // Visibility change (replaces window focus/blur)
  addListener(document, 'visibilitychange', handleVisibilityChange, true);

  // Before unload (for dwell time calculation)
  addListener(window, 'beforeunload', handleBeforeUnload, true);
}

/**
 * Setup scroll milestone tracking
 */
function setupScrollMilestones() {
  scrollMilestonesReached.clear();

  const checkScrollMilestones = throttle(() => {
    if (!isRecording || !platformDetector) return;

    const scrollPercentage = platformDetector.getCurrentScrollPercentage();

    CAPTURE_CONFIG.scrollMilestones.forEach(milestone => {
      if (scrollPercentage >= milestone && !scrollMilestonesReached.has(milestone)) {
        scrollMilestonesReached.add(milestone);
        sendEvent({
          type: 'scroll_milestone',
          milestone: milestone,
          scrollPercentage: scrollPercentage
        });
      }
    });
  }, 1000);

  addListener(window, 'scroll', checkScrollMilestones, true);
}

/**
 * Setup AI platform-specific tracking
 */
function setupAIPlatformTracking() {
  if (!currentPlatform || !platformDetector) return;

  const config = currentPlatform.config;

  // Track query input with full text capture
  const queryInput = platformDetector.findElement(config.selectors.queryInput);
  if (queryInput) {
    const handleQueryInput = debounce((e) => {
      if (!isRecording) return;

      const currentQuery = e.target.value || e.target.textContent || '';

      sendEvent({
        type: 'ai_query_input',
        platform: currentPlatform.platform,
        queryText: currentQuery,
        queryLength: currentQuery.length,
        isRefinement: lastQuery && currentQuery.includes(lastQuery),
        previousQuery: lastQuery || null
      });

      lastQuery = currentQuery;
    }, 500);

    addListener(queryInput, 'input', handleQueryInput);
    // For contenteditable
    addListener(queryInput, 'keyup', handleQueryInput);
  }

  // Track AI result link clicks with position
  const responseContainer = platformDetector.findElement(config.selectors.responseContainer);
  if (responseContainer) {
    const handleResultClick = (e) => {
      if (!isRecording) return;

      const link = e.target.closest('a');
      if (link && link.href && !link.href.startsWith(window.location.origin)) {
        const linkPosition = platformDetector.getLinkPosition(link, responseContainer);

        sendEvent({
          type: 'ai_result_click',
          platform: currentPlatform.platform,
          destination: link.href,
          linkText: link.textContent.trim().substring(0, 200),
          linkPosition: linkPosition
        });
      }
    };

    addListener(responseContainer, 'click', handleResultClick, true);
  }
}

/**
 * Setup e-commerce platform-specific tracking
 */
function setupEcommercePlatformTracking() {
  if (!currentPlatform || !platformDetector) return;

  const config = currentPlatform.config;

  // Track product link clicks
  const handleProductClick = (e) => {
    if (!isRecording) return;

    let productLink = null;

    // Try to find product link from click target
    for (const selector of (config.selectors.productLinks || [])) {
      try {
        productLink = e.target.closest(selector);
        if (productLink && productLink.href) break;
      } catch (err) {
        // Invalid selector, continue
      }
    }

    if (productLink && productLink.href) {
      const productName = platformDetector.extractProductName(productLink);

      sendEvent({
        type: 'product_click',
        platform: currentPlatform.platform,
        productUrl: productLink.href,
        productName: productName,
        referrer: document.referrer,
        fromAI: platformDetector.isFromAI(document.referrer)
      });
    }
  };

  addListener(document, 'click', handleProductClick, true);

  // Track conversion actions (add to cart, checkout, etc.)
  const handleConversionClick = (e) => {
    if (!isRecording) return;

    const allConversionSelectors = [
      ...(config.selectors.addToCart || []),
      ...(config.selectors.buyNow || []),
      ...(config.selectors.checkout || [])
    ];

    for (const selector of allConversionSelectors) {
      try {
        if (e.target.matches(selector) || e.target.closest(selector)) {
          const action = platformDetector.determineAction(selector);

          sendEvent({
            type: 'conversion_action',
            action: action,
            platform: currentPlatform.platform,
            sessionHasAIReferrer: checkSessionForAI()
          });
          break;
        }
      } catch (err) {
        // Invalid selector, continue
      }
    }
  };

  addListener(document, 'click', handleConversionClick, true);
}

/**
 * Check if this session has any AI referrers
 */
function checkSessionForAI() {
  if (!platformDetector) return false;

  // Check current referrer
  if (platformDetector.isFromAI(document.referrer)) {
    return true;
  }

  // Could extend this to check session storage for AI visits
  try {
    const sessionAI = sessionStorage.getItem('hasAIReferrer');
    return sessionAI === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Helper to add and track event listeners
 */
function addListener(element, event, handler, useCapture = false) {
  element.addEventListener(event, handler, useCapture);
  eventListeners.push({ element, event, handler });
}

/**
 * Handle click events
 */
function handleClick(event) {
  if (!isRecording) return;

  const target = event.target;
  sendEvent({
    type: 'click',
    element: {
      tag: target.tagName?.toLowerCase(),
      id: target.id,
      classes: target.className,
      text: target.textContent?.substring(0, 100),
      href: target.href,
      selector: getElementSelector(target)
    },
    coordinates: {
      x: event.clientX,
      y: event.clientY
    }
  });
}

/**
 * Handle input events
 */
function handleInput(event) {
  if (!isRecording) return;

  const target = event.target;

  // Check if this is a search query input
  const isSearchInput = isSearchQueryInput(target);

  sendEvent({
    type: 'input',
    element: {
      tag: target.tagName?.toLowerCase(),
      id: target.id,
      name: target.name,
      type: target.type,
      selector: getElementSelector(target)
    },
    // Only capture value for search inputs (privacy consideration)
    value: isSearchInput ? target.value : '[REDACTED]',
    valueLength: target.value?.length || 0,
    isSearch: isSearchInput
  });
}

/**
 * Check if input is a search query field
 */
function isSearchQueryInput(element) {
  const searchIndicators = [
    'search', 'query', 'q', 'searchbox', 'search-input',
    'google', 'bing', 'chatgpt', 'perplexity', 'gemini'
  ];

  const id = element.id?.toLowerCase() || '';
  const name = element.name?.toLowerCase() || '';
  const placeholder = element.placeholder?.toLowerCase() || '';

  return searchIndicators.some(indicator =>
    id.includes(indicator) || name.includes(indicator) || placeholder.includes(indicator)
  );
}

/**
 * Handle form submit
 */
function handleSubmit(event) {
  if (!isRecording) return;

  const form = event.target;
  sendEvent({
    type: 'form_submit',
    form: {
      id: form.id,
      action: form.action,
      method: form.method
    }
  });
}

/**
 * Handle visibility change
 */
function handleVisibilityChange() {
  if (!isRecording) return;
  sendEvent({
    type: 'visibility_change',
    hidden: document.hidden
  });
}

/**
 * Handle before unload
 */
function handleBeforeUnload() {
  if (!isRecording) return;
  sendEvent({ type: 'page_unload' });
}

/**
 * Get unique selector for element
 */
function getElementSelector(element) {
  if (element.id) return `#${element.id}`;

  let selector = element.tagName?.toLowerCase() || '';

  // Handle className safely (SVG elements have SVGAnimatedString, not string)
  if (element.classList && element.classList.length > 0) {
    selector += '.' + Array.from(element.classList).join('.');
  } else if (element.className && typeof element.className === 'string') {
    selector += '.' + element.className.split(' ').filter(Boolean).join('.');
  }

  return selector;
}

/**
 * Check if domain is excluded
 */
function isExcludedDomain(hostname) {
  return excludedDomains.some(domain => hostname.includes(domain));
}

/**
 * Check if event should be captured based on platform and type
 */
function shouldCaptureEvent(eventType) {
  // Check if domain is excluded
  if (isExcludedDomain(window.location.hostname)) {
    return false;
  }

  // Get platform type
  const platformType = currentPlatform?.type || 'general';

  // Get allowed events for this platform type
  const allowedEvents = EVENT_RULES[platformType] || EVENT_RULES.general;

  return allowedEvents.includes(eventType);
}

/**
 * Enrich event with platform context before sending
 */
function enrichEvent(eventData) {
  if (!platformDetector) return eventData;

  return {
    ...eventData,

    // Platform context
    platformType: currentPlatform?.type || 'general',
    platformName: currentPlatform?.platform || null,

    // Journey context
    referrerPlatform: platformDetector.detect(document.referrer, new URL(document.referrer || 'https://example.com').hostname)?.platform || null,
    isAIToEcommerce: platformDetector.isAIToEcommerce(document.referrer, window.location.href),

    // Engagement
    scrollDepth: platformDetector.getCurrentScrollPercentage(),
    dwellTime: Date.now() - pageLoadTime
  };
}

/**
 * Send event to background script
 */
function sendEvent(eventData) {
  // Filter event
  if (!shouldCaptureEvent(eventData.type)) {
    return;
  }

  // Enrich event with platform context
  const enrichedEvent = enrichEvent(eventData);

  chrome.runtime.sendMessage({
    type: 'EVENT_CAPTURED',
    data: enrichedEvent
  }).catch(err => {
    console.error('[Content] Error sending event:', err);
  });
}

/**
 * Throttle function
 */
function throttle(func, wait) {
  let timeout;
  let previous = 0;

  return function(...args) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
