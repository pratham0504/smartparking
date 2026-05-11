const PRODUCTION_BACKEND_URL = 'https://smartparking-f86d.onrender.com';

function isLocalDevelopmentHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export function getBackendUrl() {
  // Prefer runtime overrides (set by hosting) before build-time env vars
  if (typeof window !== 'undefined' && window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.BACKEND_URL) {
    return window.RUNTIME_CONFIG.BACKEND_URL;
  }

  if (typeof window !== 'undefined' && window.__BACKEND_URL) {
    return window.__BACKEND_URL;
  }

  if (typeof process !== 'undefined' && process.env) {
    // If a build-time env is present but points to localhost while the app
    // is running on a non-local host, ignore it to avoid baked-in localhost URLs.
    const baked = process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL;
    if (baked) {
      const runningHost = typeof window !== 'undefined' && window.location && window.location.hostname;
      if (runningHost && !isLocalDevelopmentHost(runningHost) && /localhost|127\.0\.0\.1/.test(baked)) {
        // ignore baked localhost in production
      } else {
        return baked;
      }
    }
  }

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const isLocal = isLocalDevelopmentHost(window.location.hostname);
    const chosen = isLocal
      ? 'http://localhost:3001'
      : PRODUCTION_BACKEND_URL;
    
    console.warn('[getBackendUrl] DEBUG:', {
      hostname: window.location.hostname,
      isLocal,
      chosen,
      url: window.location.href
    });
    
    return chosen;
  }

  return PRODUCTION_BACKEND_URL;
}
