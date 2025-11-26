/**
 * Platform Detection Module
 * Detects AI platforms and e-commerce sites based on configuration
 */

class PlatformDetector {
  constructor(config) {
    this.config = config;
    this.selectorCache = new Map(); // Cache successful selectors
  }

  /**
   * Detect platform from URL and hostname
   * @param {string} url - Full URL
   * @param {string} hostname - Hostname (e.g., 'chat.openai.com')
   * @returns {Object|null} Platform info or null
   */
  detect(url, hostname) {
    if (!url || !hostname) return null;

    // Check AI platforms first
    for (const [platform, config] of Object.entries(this.config.ai_platforms || {})) {
      if (this.matchesPlatform(hostname, url, config)) {
        // For Google, verify AI Overview is actually present
        if (platform === 'google_ai') {
          const hasAIOverview = this.findElement(config.selectors.aiOverview);
          if (!hasAIOverview) {
            continue; // Regular Google search, not AI
          }
        }

        return {
          platform,
          type: 'ai',
          config
        };
      }
    }

    // Check e-commerce platforms
    for (const [platform, config] of Object.entries(this.config.ecommerce_platforms || {})) {
      if (this.matchesPlatform(hostname, url, config)) {
        return {
          platform,
          type: 'ecommerce',
          config
        };
      }
    }

    return null;
  }

  /**
   * Check if URL/hostname matches platform config
   * @param {string} hostname
   * @param {string} url
   * @param {Object} config
   * @returns {boolean}
   */
  matchesPlatform(hostname, url, config) {
    // Check domain matches
    if (config.domains && config.domains.length > 0) {
      const domainMatch = config.domains.some(domain => hostname.includes(domain));
      if (domainMatch) return true;
    }

    // Check URL pattern matches
    if (config.urlPatterns && config.urlPatterns.length > 0) {
      const urlMatch = config.urlPatterns.some(pattern => url.includes(pattern));
      if (urlMatch) return true;
    }

    return false;
  }

  /**
   * Find element using multiple fallback selectors
   * @param {Array<string>} selectors - Array of CSS selectors to try
   * @returns {Element|null} First matching element or null
   */
  findElement(selectors) {
    if (!selectors || !Array.isArray(selectors)) {
      return null;
    }

    const cacheKey = selectors.join('|');

    // Check cache first
    if (this.selectorCache.has(cacheKey)) {
      const cachedSelector = this.selectorCache.get(cacheKey);
      try {
        const el = document.querySelector(cachedSelector);
        if (el) return el;
      } catch (e) {
        // Cached selector no longer works, clear it
        this.selectorCache.delete(cacheKey);
      }
    }

    // Try each selector with fallbacks
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          // Cache successful selector
          this.selectorCache.set(cacheKey, selector);
          return el;
        }
      } catch (e) {
        console.warn(`[PlatformDetector] Selector failed: ${selector}`, e);
      }
    }

    return null;
  }

  /**
   * Find all elements matching any of the selectors
   * @param {Array<string>} selectors
   * @returns {Array<Element>}
   */
  findElements(selectors) {
    if (!selectors || !Array.isArray(selectors)) {
      return [];
    }

    const elements = [];
    for (const selector of selectors) {
      try {
        const els = document.querySelectorAll(selector);
        if (els.length > 0) {
          elements.push(...Array.from(els));
        }
      } catch (e) {
        console.warn(`[PlatformDetector] Selector failed: ${selector}`, e);
      }
    }

    // Remove duplicates
    return Array.from(new Set(elements));
  }

  /**
   * Get link position relative to container
   * @param {Element} link
   * @param {Element} container
   * @returns {number} 1-indexed position
   */
  getLinkPosition(link, container) {
    if (!link || !container) return 0;

    try {
      const links = Array.from(container.querySelectorAll('a[href^="http"]'));
      const position = links.indexOf(link);
      return position >= 0 ? position + 1 : 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Extract product name from link element
   * @param {Element} productLink
   * @returns {string}
   */
  extractProductName(productLink) {
    if (!productLink) return '';

    try {
      // Try aria-label first
      if (productLink.getAttribute('aria-label')) {
        return productLink.getAttribute('aria-label').trim();
      }

      // Try image alt text
      const img = productLink.querySelector('img');
      if (img && img.alt) {
        return img.alt.trim();
      }

      // Try text content
      if (productLink.textContent) {
        return productLink.textContent.trim().substring(0, 200);
      }

      // Try href parsing
      const href = productLink.href;
      const match = href.match(/\/([^\/]+)(?:\/|\?|$)/);
      if (match) {
        return decodeURIComponent(match[1]).replace(/[-_]/g, ' ');
      }

      return '';
    } catch (e) {
      return '';
    }
  }

  /**
   * Check if current page came from an AI platform
   * @param {string} referrer
   * @returns {boolean}
   */
  isFromAI(referrer) {
    if (!referrer) return false;

    try {
      const url = new URL(referrer);
      const referrerPlatform = this.detect(referrer, url.hostname);
      return referrerPlatform?.type === 'ai';
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if this is an AI-to-ecommerce journey
   * @param {string} referrer
   * @param {string} currentUrl
   * @returns {boolean}
   */
  isAIToEcommerce(referrer, currentUrl) {
    if (!referrer || !currentUrl) return false;

    try {
      const referrerURL = new URL(referrer);
      const currentURL = new URL(currentUrl);

      const referrerPlatform = this.detect(referrer, referrerURL.hostname);
      const currentPlatform = this.detect(currentUrl, currentURL.hostname);

      return referrerPlatform?.type === 'ai' && currentPlatform?.type === 'ecommerce';
    } catch (e) {
      return false;
    }
  }

  /**
   * Get current scroll depth percentage
   * @returns {number} 0-100
   */
  getCurrentScrollPercentage() {
    try {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollHeight <= 0) return 100;

      return Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
    } catch (e) {
      return 0;
    }
  }

  /**
   * Determine action type from selector
   * @param {string} selector
   * @returns {string}
   */
  determineAction(selector) {
    const lowerSelector = selector.toLowerCase();

    if (lowerSelector.includes('checkout')) return 'checkout';
    if (lowerSelector.includes('buy-now') || lowerSelector.includes('buynow')) return 'buy_now';
    if (lowerSelector.includes('add-to-cart') || lowerSelector.includes('addtocart')) return 'add_to_cart';

    return 'unknown';
  }

  /**
   * Clear selector cache (useful after DOM changes)
   */
  clearCache() {
    this.selectorCache.clear();
  }

  /**
   * Get cache statistics for debugging
   * @returns {Object}
   */
  getCacheStats() {
    return {
      size: this.selectorCache.size,
      entries: Array.from(this.selectorCache.entries())
    };
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlatformDetector;
}
