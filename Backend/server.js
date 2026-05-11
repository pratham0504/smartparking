// ⚠️ IMPORTANT: Load environment variables FIRST
const path = require("path");
const fs = require("fs");
const envLocalPath = path.join(__dirname, ".env.local");

// Always load the base env first, then let .env.local override it for local dev.
require("dotenv").config();

if (fs.existsSync(envLocalPath)) {
  console.log("✅ Loading .env.local for local development");
  require("dotenv").config({ path: envLocalPath, override: true });
} else {
  console.log("ℹ️  No .env.local found, using .env");
}

// Unified Port Definition
const PORT = process.env.PORT || 3001; 

const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();

// Trust proxy is essential for session cookies on Render/Vercel
app.set('trust proxy', 1);
app.disable('x-powered-by');

const helmet = require("helmet");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

const connectDB = require("./src/config/db");
const { MONGO_ATLAS_URI } = require("./src/config/db");
const cors = require("cors");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const http = require("http");
const { spawn } = require('child_process');
const { Server } = require("socket.io");
const session = require("express-session");
const MongoStore = require('connect-mongo');

const SESSION_SECRET = process.env.SESSION_SECRET || "parkEz_secure_session_key_2025";

connectDB();

// CORS Configuration
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173"
];

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : defaultAllowedOrigins;

function isTrustedPreviewOrigin(origin) {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || isTrustedPreviewOrigin(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};

// Socket.IO CORS configuration (needs slightly different format than Express CORS)
const socketIoCorsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || isTrustedPreviewOrigin(origin)) {
      callback(null, true);
    } else {
      console.log(`Socket.IO CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_ATLAS_URI,
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60
    }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      httpOnly: true, 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 3600000 
    },
  })
);

const passport = require("./src/config/passport");
app.use(passport.initialize());
app.use(passport.session());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_images",
    format: async (req, file) => "jpg",
    public_id: (req, file) => req.user._id,
  },
});
const upload = multer({ storage }).single("image");

const uploadsDir = path.join(__dirname, 'uploads/plates');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const claimRoutes = require("./src/routes/claimRoutes");
const contractRoutes = require("./src/routes/contractRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const reservationRoutes = require("./src/routes/reservationRoutes");
const subscriptionRoutes = require("./src/routes/subscriptionRoutes");
const passwordRoutes = require("./src/routes/passwordRoutes");
const parkingRoutes = require("./src/routes/parkingRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const favoriteRoutes = require("./src/routes/favoriteRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const slotRoutes = require("./src/routes/slotRoutes");
const plateDetectionRoutes = require('./src/routes/plateDetectionRoutes');
const cameraRoutes = require('./src/routes/cameraRoutes');
const fastagRoutes = require('./src/routes/fastagRoutes');
const passageRoutes = require('./src/routes/passageRoutes');
const rfidGateRoutes = require('./src/routes/rfidGateRoutes');

const { register, metricsMiddleware } = require('./src/monitoring');
const claimErrorHandler = require('./src/middlewares/claimErrorHandler');

app.use(metricsMiddleware);
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: socketIoCorsOptions,
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000
});

io.on('connection', (socket) => {
  socket.on('authenticate', async (token) => {
    try {
      if (!token) throw new Error('No token provided');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.join(`user_${decoded.id}`);
      socket.emit('authenticated', { userId: decoded.id });
    } catch (error) {
      socket.emit('auth_error', { message: error.message });
    }
  });
  socket.on('disconnect', () => {});
});

app.set('io', io);

try {
  const { initMqtt } = require('./src/services/mqttIngest');
} catch (err) {
  console.warn('MQTT ingest service not initialized:', err.message);
}

app.use("/auth", authRoutes);
app.use("/User", userRoutes);
app.use("/api", userRoutes);
app.use("/api", claimRoutes);
app.use("/api", contractRoutes);
app.use("/api", reportRoutes);
app.use("/api", reservationRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", passwordRoutes);
app.use('/api', parkingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use('/api/notify', notificationRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/plate-detection', plateDetectionRoutes);
app.use('/api/camera', cameraRoutes);
app.use('/api/fastag', fastagRoutes);
app.use('/api/passages', passageRoutes);
app.use('/api/rfid', rfidGateRoutes);

const demoPath = path.join(__dirname, '../Front-end-Front-Office-/public');
if (fs.existsSync(demoPath)) {
  app.use('/demo', express.static(demoPath));
}

app.use(claimErrorHandler);

app.get("/", (req, res) => {
  res.send("MongoDB is connected to Express!");
});

// START SERVER
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server started on port ${PORT}!`);
  
  const startPythonServices =
    process.env.START_PY_SERVICES === 'true' ||
    (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) ||
    Boolean(process.env.RENDER);
  if (startPythonServices) {
    // Debug: print resolved environment flags so Render logs show why services may be skipped
    const isVercel = Boolean(process.env.VERCEL);
    const isLocalLike = process.env.NODE_ENV !== 'production' && !isVercel;
    console.log('🔎 Service startup flags:', {
      START_PY_SERVICES: process.env.START_PY_SERVICES,
      START_PLATE_DETECTOR: process.env.START_PLATE_DETECTOR,
      START_RFID_BRIDGE: process.env.START_RFID_BRIDGE,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      RENDER: process.env.RENDER,
      isVercel,
      isLocalLike,
      startPythonServices
    });
    // In Render/Docker, __dirname might be /app/Backend or /app, so calculate appropriately
    const projectRoot = process.env.RENDER ? '/app' : path.join(__dirname, '..');
    const pythonBin = process.env.PYTHON_BIN || 'python3';
    
    // Debug: log projectRoot and __dirname for troubleshooting
    console.log(`📁 __dirname: ${__dirname}`);
    console.log(`📁 projectRoot: ${projectRoot}`);
    console.log(`📁 RENDER: ${process.env.RENDER}`);

    // Resolve plate detector script path with fallbacks (some build systems may alter folder names)
    const detectorCandidates = [
      path.join(projectRoot, 'Car-Number-Plates-Detection-IA-Model-', 'indian_plate_detector_tesseract.py'),
      path.join(projectRoot, 'Car-Number-Plates-Detection-IA-Model', 'indian_plate_detector_tesseract.py'),
      // Check inside Backend subfolder (some CI/CD copy project into /app and place service files under Backend)
      path.join(projectRoot, 'Backend', 'Car-Number-Plates-Detection-IA-Model-', 'indian_plate_detector_tesseract.py'),
      path.join(projectRoot, 'Backend', 'Car-Number-Plates-Detection-IA-Model', 'indian_plate_detector_tesseract.py'),
      // Also check relative to current __dirname (which may be /app or /app/Backend)
      path.join(__dirname, 'Backend', 'Car-Number-Plates-Detection-IA-Model-', 'indian_plate_detector_tesseract.py'),
      path.join(__dirname, 'Backend', 'Car-Number-Plates-Detection-IA-Model', 'indian_plate_detector_tesseract.py'),
      path.join(__dirname, 'Car-Number-Plates-Detection-IA-Model-', 'indian_plate_detector_tesseract.py'),
      path.join(__dirname, 'Car-Number-Plates-Detection-IA-Model', 'indian_plate_detector_tesseract.py')
    ];

    console.log('🔎 Detector path candidates:', detectorCandidates);
    let resolvedDetectorScript = null;
    try {
      // Log projectRoot contents to aid remote debugging
      const rootFiles = fs.readdirSync(projectRoot);
      console.log('📂 projectRoot contents:', rootFiles);
    } catch (err) {
      console.warn('⚠️  Could not list projectRoot contents:', err.message);
    }

    for (const c of detectorCandidates) {
      if (fs.existsSync(c)) {
        resolvedDetectorScript = c;
        break;
      }
    }

    if (!resolvedDetectorScript) {
      console.warn('⚠️  No detector script found in candidates, plate-detector will be disabled unless file is present in build.');
    } else {
      console.log('✅ Resolved detector script at:', resolvedDetectorScript);
    }

    const services = [
      {
        name: 'plate-detector',
        enabled:
          (process.env.START_PLATE_DETECTOR === 'true' || isLocalLike || startPythonServices) && Boolean(resolvedDetectorScript),
        script: resolvedDetectorScript,
        args: [],
        env: {
          DETECTOR_HOST: process.env.DETECTOR_HOST || '0.0.0.0',
          DETECTOR_PORT: process.env.DETECTOR_PORT || '5002',
        },
      },
      {
        name: 'rfid-bridge',
        enabled:
          process.env.START_RFID_BRIDGE === 'true' || isLocalLike ||
          startPythonServices,
        script: path.join(__dirname, 'src', 'rfidGateBridge.py'),
        args: [],
        env: {
          BACKEND_URL: process.env.BACKEND_URL || `http://localhost:${PORT}`,
        },
      }
    ];

    services.forEach(svc => {
      // Check if script exists first; if not, disable the service
      if (svc.enabled && !fs.existsSync(svc.script)) {
        console.log(`⚠️  ${svc.name} script not found at ${svc.script}. Disabling service.`);
        svc.enabled = false;
      }

      if (!svc.enabled) {
        console.log(`ℹ️  Skipping ${svc.name} (disabled for this environment)`);
        return;
      }

      let failureCount = 0;
      let lastFailureTime = 0;
      const startService = () => {
        try {
          console.log(`🔧 Spawning ${svc.name}: ${pythonBin} ${svc.script}`);
          const proc = spawn(pythonBin, [svc.script, ...svc.args], {
            cwd: path.dirname(svc.script),
            env: { ...process.env, ...svc.env },
            stdio: ['ignore', 'pipe', 'pipe']
          });

          proc.on('error', (err) => {
            console.error(`❌ Failed to spawn ${svc.name} (${err.code}): ${err.message}`);
            failureCount++;
            lastFailureTime = Date.now();
            if (failureCount >= 5) {
              console.error(`❌ ${svc.name} failed 5 times. Giving up. Fix the service and restart.`);
              return;
            }
            setTimeout(startService, 5000);
          });
          proc.stdout.on('data', data => process.stdout.write(`[${svc.name}] ${data}`));
          proc.stderr.on('data', data => process.stderr.write(`[${svc.name}] ${data}`));
          proc.on('exit', (code) => {
            // Don't count clean exits (code 0) as failures; only genuine errors count
            if (code !== 0) {
              failureCount++;
              lastFailureTime = Date.now();
            }
            
            if (code === 0) {
              console.log(`ℹ️  ${svc.name} exited cleanly. Not restarting.`);
              return;
            }
            
            if (failureCount >= 5) {
              console.error(`❌ ${svc.name} failed ${failureCount} times. Giving up.`);
              return;
            }
            console.log(`⚠️  ${svc.name} exited with code ${code}. Restarting in 5s...`);
            setTimeout(startService, 5000);
          });
        } catch (err) {
          console.error(`❌ Exception starting ${svc.name}:`, err.message);
        }
      };
      startService();
    });
  }
});