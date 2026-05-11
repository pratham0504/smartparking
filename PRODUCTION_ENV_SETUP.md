# Production Environment Setup Guide

## Quick Reference for Render Backend & Vercel Frontend

### Latest Deployed URLs
- **Front-Office (User App):** https://smartparking-oc73ovt00-prathams-projects-acab7237.vercel.app
- **Back-Office (Admin App):** https://smartparking-bs7tyo9fi-prathams-projects-acab7237.vercel.app
- **Backend API:** https://smartparking-f86d.onrender.com

---

## 1. Render Backend Environment Variables

Set these in your Render dashboard → Environment Variables:

### Required (Must Update)
```
FRONTEND_URL=https://smartparking-oc73ovt00-prathams-projects-acab7237.vercel.app
GOOGLE_CALLBACK_URL=https://smartparking-f86d.onrender.com/auth/google/callback
CORS_ALLOWED_ORIGINS=https://smartparking-oc73ovt00-prathams-projects-acab7237.vercel.app,https://smartparking-bs7tyo9fi-prathams-projects-acab7237.vercel.app
```

### Keep As-Is (From Your Dashboard)
```
MONGO_ATLAS_URI=[your MongoDB connection string]
SESSION_SECRET=[your session secret]
JWT_SECRET=[your JWT secret]
CLOUDINARY_CLOUD_NAME=[your cloudinary name]
CLOUDINARY_API_KEY=[your cloudinary key]
CLOUDINARY_API_SECRET=[your cloudinary secret]
GOOGLE_CLIENT_ID=[your Google OAuth client ID]
GOOGLE_CLIENT_SECRET=[your Google OAuth client secret]
```

### Optional
```
PORT=10000
NODE_ENV=production
MQTT_URL=mqtt://localhost:1883
MQTT_PREFIX=parkEz
```

---

## 2. Vercel Frontend Environment Variables

Already set in [`Front-end-Front-Office-/.env.production`](Front-end-Front-Office-/.env.production):

```
REACT_APP_BACKEND_URL=https://smartparking-f86d.onrender.com
REACT_APP_ADMIN_URL=https://smartparking-bs7tyo9fi-prathams-projects-acab7237.vercel.app
REACT_APP_MAPBOX_TOKEN=[from your .env]
REACT_APP_GOOGLE_MAPS_API_KEY=[from your .env]
VITE_BACKEND_URL=https://smartparking-f86d.onrender.com
VITE_MAPBOX_TOKEN=[from your .env]
```

---

## 3. What Each URL Does

| URL | Purpose | Used By |
|-----|---------|---------|
| https://smartparking-oc73ovt00-prathams-projects-acab7237.vercel.app | User-facing parking app | Frontend, Email links, Login redirects |
| https://smartparking-bs7tyo9fi-prathams-projects-acab7237.vercel.app | Admin dashboard | Admin redirects from user app |
| https://smartparking-f86d.onrender.com | API server | All frontend API calls, Socket.IO |

---

## 4. Steps to Apply Changes

### On Render Dashboard:
1. Go to **Environment** section
2. Update `FRONTEND_URL` to: `https://smartparking-oc73ovt00-prathams-projects-acab7237.vercel.app`
3. Update `CORS_ALLOWED_ORIGINS` to include both Vercel domains
4. Click **Save** → Render auto-redeploys

### On Vercel:
1. The `.env.production` file is already committed
2. Vercel auto-deployed the latest commit
3. If you need to force redeploy:
   - Go to Deployments
   - Click the latest deployment
   - Click "Redeploy"

---

## 5. Testing

After deploying:

**Test user login:**
- Go to https://smartparking-oc73ovt00-prathams-projects-acab7237.vercel.app/login
- Login with a regular user account
- Should see parkings, reservations, notifications

**Test admin login:**
- Go to https://smartparking-oc73ovt00-prathams-projects-acab7237.vercel.app/login
- Login with an admin account
- Should redirect to https://smartparking-bs7tyo9fi-prathams-projects-acab7237.vercel.app
- Should NOT show 404

**Test API calls:**
- Open DevTools → Network
- Should see calls to `https://smartparking-f86d.onrender.com/api/*`
- Should NOT see calls to `http://localhost:3001`

---

## 6. If Still Having Issues

### 404 on admin login
- Confirm `REACT_APP_ADMIN_URL` in frontend `.env.production`
- Verify admin app is deployed at the second Vercel domain

### Network errors on front-office
- Check browser console for blocked localhost requests
- Confirm `REACT_APP_BACKEND_URL` is set to Render URL
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### Email links go to wrong domain
- Confirm `FRONTEND_URL` on Render backend
- Restart Render deployment

---

## 7. Files Modified

- `Front-end-Front-Office-/.env.production` – Production backend URLs (committed)
- `Front-end-Front-Office-/public/index.html` – Runtime config injection & network shims (committed)
- Render dashboard Environment Variables – Updated manually (not in repo)

