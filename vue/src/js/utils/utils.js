// Generates GUID
export function guid() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

export function getBrowserInstanceId() {
  const browserInstanceIdKey = 'browser-instance-id';
  let browserInstanceId = sessionStorage.getItem(browserInstanceIdKey);

  if (!browserInstanceId) {
    if (window.crypto && window.crypto.randomUUID) {
      browserInstanceId = window.crypto.randomUUID();
    } else {
      browserInstanceId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    sessionStorage.setItem(browserInstanceIdKey, browserInstanceId);
  }

  return browserInstanceId;
}

/**
 * Scrolls a given element into the viewport based on specific rules,
 * prioritizing the alignment of the top or bottom edge.
 *
 * @param {HTMLElement} element The DOM element to scroll into view.
 */
export function scrollElementIntoView(element) {
  if (!element) {
    console.error("Element not provided or not found.");
    return;
  }

  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  
  const isTopOutOfView = rect.top < 0;
  const isBottomOutOfView = rect.bottom > viewportHeight;

  // 1. Element is completely within the viewport
  if (!isTopOutOfView && !isBottomOutOfView) {
    // Do nothing
    return;
  }

  // 2. Element is larger than the viewport
  // Requirement: If element > viewport, scroll so the top of the element is visible.
  if (rect.height > viewportHeight) {
    // Use 'start' to align the top of the element with the top of the viewport.
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start' 
    });
  } 
  // 3. Top part is out of view OR Element is shorter than viewport and only the top is out
  else if (isTopOutOfView) {
    // Requirement: If the top is out, scroll so the top is visible.
    // Use 'start' to align the top of the element with the top of the viewport.
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  } 
  // 4. Bottom part is out of view (and top is already in view)
  else if (isBottomOutOfView) {
    // Requirement: If the bottom is out, scroll so the bottom is visible.
    // Use 'end' to align the bottom of the element with the bottom of the viewport.
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    });
  }
}