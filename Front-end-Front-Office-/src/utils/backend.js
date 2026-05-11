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

function isLoopbackUrl(value) {
  if (!value || typeof value !== 'string') return false;

  try {
    const parsed = new URL(value);
    return isLocalDevelopmentHost(parsed.hostname);
  } catch (_error) {
    // Fallback for malformed URLs that still contain localhost patterns.
    return /localhost|127\.0\.0\.1/.test(value);
  }
}

function pickSafeBackendUrl(candidate, runningHost) {
  if (!candidate) return null;
  if (!runningHost) return candidate;

  const runningInLocalHost = isLocalDevelopmentHost(runningHost);
  const candidateIsLoopback = isLoopbackUrl(candidate);

  if (!runningInLocalHost && candidateIsLoopback) {
    return null;
  }

  return candidate;
}

export function getBackendUrl() {
  const runningHost = typeof window !== 'undefined' && window.location && window.location.hostname
    ? window.location.hostname
    : '';

  // Prefer runtime overrides (set by hosting) before build-time env vars.
  if (typeof window !== 'undefined' && window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.BACKEND_URL) {
    const safeRuntime = pickSafeBackendUrl(window.RUNTIME_CONFIG.BACKEND_URL, runningHost);
    if (safeRuntime) return safeRuntime;
  }

  if (typeof window !== 'undefined' && window.__BACKEND_URL) {
    const safeWindow = pickSafeBackendUrl(window.__BACKEND_URL, runningHost);
    if (safeWindow) return safeWindow;
  }

  if (typeof process !== 'undefined' && process.env) {
    const baked = process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL;
    const safeBaked = pickSafeBackendUrl(baked, runningHost);
    if (safeBaked) return safeBaked;
  }

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const isLocal = isLocalDevelopmentHost(window.location.hostname);
    return isLocal
      ? 'http://localhost:3001'
      : PRODUCTION_BACKEND_URL;
  }

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
