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
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
    if (process.env.VITE_BACKEND_URL) return process.env.VITE_BACKEND_URL;
  }

  if (typeof window !== 'undefined' && window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.BACKEND_URL) {
    return window.RUNTIME_CONFIG.BACKEND_URL;
  }

  if (typeof window !== 'undefined' && window.__BACKEND_URL) {
    return window.__BACKEND_URL;
  }

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return isLocalDevelopmentHost(window.location.hostname)
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
