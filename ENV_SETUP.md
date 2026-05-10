# Environment Configuration Guide

## Overview
Your application now supports **automatic environment detection** for local development vs production deployment:
- **Local Development** (VS Code): Uses `localhost` URLs
- **Production** (Vercel/Render): Uses deployed URLs

## Files Setup

### Frontend (`Front-end-Front-Office-/`)

#### `.env` (Production Values - Committed to Git)
```
REACT_APP_BACKEND_URL=https://smartparking-f86d.onrender.com
REACT_APP_ADMIN_URL=https://smartparking-q08aodqbs-prathams-projects-acab7237.vercel.app/admin
```

#### `.env.local` (Local Development - Git-Ignored)
```
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_ADMIN_URL=http://localhost:5173
```

**How it works**: When you run `npm start` locally, Create React App automatically loads `.env.local` which overrides `.env`. When deployed to Vercel, only `.env` is used (`.env.local` is not pushed to git).

### Backend (`Backend/`)

#### `.env` (Production Values - Committed to Git)
```
FRONTEND_URL=https://smartparking-q08aodqbs-prathams-projects-acab7237.vercel.app
BASE_URL=https://smartparking-f86d.onrender.com
GOOGLE_CALLBACK_URL=https://smartparking-f86d.onrender.com/auth/google/callback
```

#### `.env.local` (Local Development - Git-Ignored)
```
FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:3001
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
```

**How it works**: Node.js loads `.env.local` when available, otherwise falls back to `.env`.

## Testing Guide

### ✅ Local Development (VS Code)

1. **Start the Backend**:
   ```bash
   cd Backend
   npm start
   ```
   Should run on `http://localhost:3001`

2. **Start the Frontend** (in new terminal):
   ```bash
   cd Front-end-Front-Office-
   npm start
   ```
   Should run on `http://localhost:3000`

3. **Test Email/Password Login**:
   - Navigate to Login page
   - Enter credentials
   - Should NOT redirect to localhost (stays in app)

4. **Test Google Login**:
   - Click "Continue with Google"
   - You'll be redirected to Google's OAuth
   - After approval, you'll return to `http://localhost:3000/google/callback`
   - Should successfully log in and redirect to dashboard

### ✅ Production Deployment (Vercel/Render)

1. **Backend on Render**:
   - Uses `.env` → `FRONTEND_URL=https://smartparking-q08aodqbs-prathams-projects-acab7237.vercel.app`
   - All auth redirects point to Vercel

2. **Frontend on Vercel**:
   - Uses `.env` → `REACT_APP_BACKEND_URL=https://smartparking-f86d.onrender.com`
   - All API calls go to Render backend
   - Admin redirects go to `/admin` on Vercel

3. **Test Google Login**:
   - Click "Continue with Google"
   - After approval, returns to `https://smartparking-...vercel.app/google/callback`
   - Should NOT see localhost anymore

## Environment Variables Summary

| Variable | Local | Production |
|----------|-------|----------|
| `REACT_APP_BACKEND_URL` | `http://localhost:3001` | `https://smartparking-f86d.onrender.com` |
| `REACT_APP_ADMIN_URL` | `http://localhost:5173` | `https://smartparking-q08aodqbs-prathams-projects-acab7237.vercel.app/admin` |
| `FRONTEND_URL` (Backend) | `http://localhost:3000` | `https://smartparking-q08aodqbs-prathams-projects-acab7237.vercel.app` |
| `BASE_URL` (Backend) | `http://localhost:3001` | `https://smartparking-f86d.onrender.com` |

## Troubleshooting

### "Connection problem" on Vercel
- Verify Backend `.env` on Render has correct URLs
- Verify Frontend `.env` on Vercel workspace has Render backend URL
- Check CORS_ALLOWED_ORIGINS includes Vercel domain

### Google login redirects to localhost in production
- Backend `.env` is using localhost values
- Update Backend env vars on Render dashboard
- Restart Render backend

### Local development can't connect
- Verify `.env.local` files exist in Frontend and Backend directories
- Run `npm start` from the correct directory
- Verify Backend is running on port 3001

## Git Management

**NEVER commit `.env.local` files** - they're in `.gitignore`.

To deploy changes to production:
1. Update code as needed
2. Push to GitHub (`.env.local` won't be pushed)
3. Vercel/Render will use `.env` files automatically
