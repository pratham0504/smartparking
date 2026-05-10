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
  return 'http://localhost:3001';
}

export function getAdminFrontendUrl() {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_ADMIN_URL) return process.env.REACT_APP_ADMIN_URL;
    if (process.env.VITE_ADMIN_URL) return process.env.VITE_ADMIN_URL;
  }
  if (typeof window !== 'undefined' && window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.ADMIN_URL) {
    return window.RUNTIME_CONFIG.ADMIN_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}
