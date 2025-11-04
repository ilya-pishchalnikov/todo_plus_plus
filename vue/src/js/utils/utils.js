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