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
  // FIRST: Check runtime config (set by index.html injection or hosting)
  if (typeof window !== 'undefined' && window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.BACKEND_URL) {
    const runtimeUrl = window.RUNTIME_CONFIG.BACKEND_URL;
    if (runtimeUrl && typeof runtimeUrl === 'string') {
      console.log('[getBackendUrl] Using RUNTIME_CONFIG:', runtimeUrl);
      return runtimeUrl;
    }
  }

  // SECOND: Check window.__BACKEND_URL
  if (typeof window !== 'undefined' && window.__BACKEND_URL) {
    console.log('[getBackendUrl] Using window.__BACKEND_URL:', window.__BACKEND_URL);
    return window.__BACKEND_URL;
  }

  // THIRD: Check build-time env vars (fallback)
  if (typeof process !== 'undefined' && process.env) {
    const baked = process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL;
    if (baked && typeof baked === 'string') {
      console.log('[getBackendUrl] Using build-time env:', baked);
      return baked;
    }
  }

  // FOURTH: Detect based on running hostname
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const isLocal = isLocalDevelopmentHost(window.location.hostname);
    const chosen = isLocal ? 'http://localhost:3001' : PRODUCTION_BACKEND_URL;
    console.log('[getBackendUrl] Using hostname detection:', chosen, '(host:', window.location.hostname, ')');
    return chosen;
  }

  // FALLBACK
  console.log('[getBackendUrl] Using production fallback:', PRODUCTION_BACKEND_URL);
  return PRODUCTION_BACKEND_URL;
}

export function getAdminFrontendUrl() {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_ADMIN_URL) return process.env.REACT_APP_ADMIN_URL;
    if (process.env.VITE_ADMIN_URL) return process.env.VITE_ADMIN_URL;
  }
  if (typeof window !== 'undefined' && window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.ADMIN_URL) {
    return window.RUNTIME_CONFIG.ADMIN_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return isLocalDevelopmentHost(window.location.hostname)
      ? 'http://localhost:5173'
      : 'https://smartparking-bs7tyo9fi-prathams-projects-acab7237.vercel.app/admin';
  }
  return 'http://localhost:5173';
}
