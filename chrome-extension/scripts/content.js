/**
 * Content Script - Injected into all pages
 * Captures user interactions, DOM changes, and page events
 */

// State
let isRecording = false;
let observers = [];
let eventListeners = [];

// Configuration
const CAPTURE_CONFIG = {
  captureClicks: true,
  captureScrolls: true,
  captureInputs: true,
  captureMutations: true,
  captureMouseMovement: false, // Can be very verbose
  scrollThrottle: 500, // ms
  mouseMoveThrottle: 1000 // ms
};

/**
 * Initialize content script
 */
(function init() {
  console.log('LLM Search Behavior Tracker - Content script loaded');

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
 * Start capturing events
 */
function startCapturing() {
  if (isRecording) return;
  isRecording = true;

  console.log('Starting event capture on:', window.location.href);

  // Capture DOM snapshot
  captureDOMSnapshot();

  // Setup event listeners
  setupEventListeners();

  // Setup mutation observer
  if (CAPTURE_CONFIG.captureMutations) {
    setupMutationObserver();
  }
}

/**
 * Stop capturing events
 */
function stopCapturing() {
  if (!isRecording) return;
  isRecording = false;

  console.log('Stopping event capture');

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
  sendEvent({
    type: 'page_load',
    url: window.location.href,
    title: document.title,
    referrer: document.referrer,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height
    },
    performance: {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
    }
  });
}

/**
 * Capture full DOM snapshot
 */
function captureDOMSnapshot() {
  // Capture simplified DOM structure (not full HTML to reduce size)
  const snapshot = {
    type: 'dom_snapshot',
    url: window.location.href,
    title: document.title,
    meta: extractMetadata(),
    structure: simplifyDOM(document.body),
    forms: extractForms(),
    links: extractLinks(),
    images: extractImages()
  };

  sendEvent(snapshot);
}

/**
 * Extract page metadata
 */
function extractMetadata() {
  const meta = {};
  document.querySelectorAll('meta').forEach(tag => {
    const name = tag.getAttribute('name') || tag.getAttribute('property');
    const content = tag.getAttribute('content');
    if (name && content) {
      meta[name] = content;
    }
  });
  return meta;
}

/**
 * Simplify DOM for storage (capture structure, not full content)
 */
function simplifyDOM(element, depth = 0, maxDepth = 5) {
  if (!element || depth > maxDepth) return null;

  const simplified = {
    tag: element.tagName?.toLowerCase(),
    id: element.id || undefined,
    classes: element.className ? element.className.split(' ').filter(Boolean) : undefined,
    children: []
  };

  // Only traverse important elements
  if (depth < maxDepth && element.children) {
    for (let child of element.children) {
      const simplifiedChild = simplifyDOM(child, depth + 1, maxDepth);
      if (simplifiedChild) {
        simplified.children.push(simplifiedChild);
      }
    }
  }

  return simplified;
}

/**
 * Extract form information
 */
function extractForms() {
  return Array.from(document.querySelectorAll('form')).map(form => ({
    id: form.id,
    action: form.action,
    method: form.method,
    fields: Array.from(form.elements).map(el => ({
      type: el.type,
      name: el.name,
      id: el.id
    }))
  }));
}

/**
 * Extract links
 */
function extractLinks() {
  return Array.from(document.querySelectorAll('a[href]'))
    .slice(0, 100) // Limit to first 100 links
    .map(link => ({
      href: link.href,
      text: link.textContent?.trim().substring(0, 100),
      id: link.id
    }));
}

/**
 * Extract images
 */
function extractImages() {
  return Array.from(document.querySelectorAll('img[src]'))
    .slice(0, 50) // Limit to first 50 images
    .map(img => ({
      src: img.src,
      alt: img.alt,
      id: img.id
    }));
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Click events
  if (CAPTURE_CONFIG.captureClicks) {
    addListener(document, 'click', handleClick, true);
  }

  // Scroll events
  if (CAPTURE_CONFIG.captureScrolls) {
    addListener(window, 'scroll', throttle(handleScroll, CAPTURE_CONFIG.scrollThrottle), true);
  }

  // Input events
  if (CAPTURE_CONFIG.captureInputs) {
    addListener(document, 'input', handleInput, true);
    addListener(document, 'change', handleChange, true);
    addListener(document, 'submit', handleSubmit, true);
  }

  // Focus events
  addListener(window, 'focus', handleFocus, true);
  addListener(window, 'blur', handleBlur, true);

  // Visibility change
  addListener(document, 'visibilitychange', handleVisibilityChange, true);

  // Before unload
  addListener(window, 'beforeunload', handleBeforeUnload, true);
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
      y: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY
    }
  });
}

/**
 * Handle scroll events
 */
function handleScroll(event) {
  if (!isRecording) return;

  sendEvent({
    type: 'scroll',
    position: {
      x: window.scrollX,
      y: window.scrollY
    },
    percentage: {
      x: (window.scrollX / (document.documentElement.scrollWidth - window.innerWidth)) * 100,
      y: (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
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
 * Handle change events
 */
function handleChange(event) {
  if (!isRecording) return;

  const target = event.target;
  sendEvent({
    type: 'change',
    element: {
      tag: target.tagName?.toLowerCase(),
      id: target.id,
      name: target.name,
      type: target.type
    }
  });
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
 * Handle window focus
 */
function handleFocus() {
  if (!isRecording) return;
  sendEvent({ type: 'window_focus' });
}

/**
 * Handle window blur
 */
function handleBlur() {
  if (!isRecording) return;
  sendEvent({ type: 'window_blur' });
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
 * Setup mutation observer for DOM changes
 */
function setupMutationObserver() {
  const observer = new MutationObserver(throttle((mutations) => {
    if (!isRecording) return;

    const significantMutations = mutations.filter(mutation => {
      // Filter out insignificant mutations
      return mutation.type === 'childList' && mutation.addedNodes.length > 0;
    });

    if (significantMutations.length > 0) {
      sendEvent({
        type: 'dom_mutation',
        mutationCount: significantMutations.length,
        addedNodes: significantMutations.reduce((sum, m) => sum + m.addedNodes.length, 0),
        removedNodes: significantMutations.reduce((sum, m) => sum + m.removedNodes.length, 0)
      });
    }
  }, 1000));

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });

  observers.push(observer);
}

/**
 * Get unique selector for element
 */
function getElementSelector(element) {
  if (element.id) return `#${element.id}`;

  let selector = element.tagName?.toLowerCase() || '';
  if (element.className) {
    selector += '.' + element.className.split(' ').filter(Boolean).join('.');
  }

  return selector;
}

/**
 * Send event to background script
 */
function sendEvent(eventData) {
  chrome.runtime.sendMessage({
    type: 'EVENT_CAPTURED',
    data: eventData
  }).catch(err => {
    console.error('Error sending event:', err);
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
