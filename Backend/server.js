// ⚠️ IMPORTANT: Load environment variables FIRST, before anything else
// This must happen before any other code reads process.env
const path = require("path");
const fs = require("fs");
const envLocalPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envLocalPath)) {
  console.log("✅ Loading .env.local for local development");
  require("dotenv").config({ path: envLocalPath });
} else {
  console.log("ℹ️  No .env.local found, using .env");
  require("dotenv").config();
}

const PORT = process.env.PORT || 10000;
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
app.set('trust proxy', 1);
// Protection contre le fingerprinting - désactiver l'en-tête X-Powered-By
app.disable('x-powered-by');

// Ajouter helmet pour une sécurité renforcée avec paramètres spécifiques
const helmet = require("helmet");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Use process.env.PORT provided by Heroku or default to 3001
const port = process.env.PORT || 3001;
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
const MongoStore = require('connect-mongo'); // Import connect-mongo

// Définition explicite d'une clé secrète de session pour éviter l'erreur "secret option required for sessions"
const SESSION_SECRET = process.env.SESSION_SECRET || "parkEz_secure_session_key_2025";

connectDB();

// CORS Configuration
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173"
];

// Parse environment variable if it exists, otherwise use default origins
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : defaultAllowedOrigins;

console.log("Allowed CORS origins:", allowedOrigins);

function isTrustedPreviewOrigin(origin) {
  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.vercel.app')
    );
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
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
  maxAge: 86400, // 24 hours of caching preflight requests
};

// Apply CORS Middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// Express Middleware
app.use(express.json({ limit: '1mb' })); // Limite la taille des requêtes JSON
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Limite la taille des requêtes formulaires

// Express-Session Configuration - Utilisation de la clé secrète définie explicitement
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_ATLAS_URI, // Use Atlas URI directly
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60
    }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // En production, activer HTTPS uniquement
      httpOnly: true, // CORRECTION: Activer httpOnly pour empêcher l'accès via JavaScript côté client
      sameSite: 'strict', // Protection contre CSRF
      maxAge: 3600000 // Session d'une heure (en millisecondes)
    },
  })
);

// Passport Authentication
const passport = require("./src/config/passport");
app.use(passport.initialize());
app.use(passport.session());

// Multer Configuration for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_images",
    format: async (req, file) => "jpg",
    public_id: (req, file) => req.user._id,
  },
});
const upload = multer({ storage }).single("image");

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads/plates');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Import Routes
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


// Import Monitoring
const { register, metricsMiddleware } = require('./src/monitoring');

// Import error handlers
const claimErrorHandler = require('./src/middlewares/claimErrorHandler');

// Ajoutez le middleware de métriques
app.use(metricsMiddleware);

// Endpoint pour les métriques Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

// Create HTTP & Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: defaultAllowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Socket.IO Connection handling
io.on('connection', (socket) => {
  //console.log('User connected:', socket.id);

  // Authenticate socket connection using token
  socket.on('authenticate', async (token) => {
    try {
      if (!token) {
        throw new Error('No token provided');
      }
      
      // Verify token and get user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        throw new Error('Invalid token');
      }

      socket.userId = decoded.id;
      // Join a room specific to this user
      socket.join(`user_${decoded.id}`);
      
      // Send acknowledgment of successful authentication
      socket.emit('authenticated', { userId: decoded.id });
      console.log('Socket authenticated for user:', decoded.id);
    } catch (error) {
      console.error('Socket authentication failed:', error);
      socket.emit('auth_error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to our routes
app.set('io', io);

// Initialize MQTT ingest service (if available)
try {
  const { initMqtt } = require('./src/services/mqttIngest');
  // initMqtt({ io }); // Commented out to prevent connection errors when no MQTT broker is running
} catch (err) {
  console.warn('MQTT ingest service not initialized:', err.message);
}

// Define Routes
app.use("/auth", authRoutes);

// Mount user routes at both /User and /api for compatibility with different frontends
app.use("/User", userRoutes);
app.use("/api", userRoutes);
app.use("/api", claimRoutes);
app.use("/api", contractRoutes);
app.use("/api", reportRoutes);
app.use("/api", reservationRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", passwordRoutes);
app.use('/parkings', parkingRoutes); 
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

// Serve the mobile demo page from Front-end public folder for quick testing
const demoPath = path.join(__dirname, '../Front-end-Front-Office-/public');
if (fs.existsSync(demoPath)) {
  app.use('/demo', express.static(demoPath));
  console.log('Serving demo pages at /demo from', demoPath);
}

// Add error handlers
app.use(claimErrorHandler);

// Test Route
app.get("/", (req, res) => {
  res.send("MongoDB is connected to Express!");
});

// Start Server
// Use the 'port' variable defined above
server.listen(port, () => {
  console.log(`Server started on port ${port}!`);
  // Optionally spawn local Python helper services (detector + RFID bridge)
  const startPythonServices = process.env.START_PY_SERVICES !== 'false';
  if (startPythonServices) {
    const projectRoot = path.join(__dirname, '..');

    const services = [
      {
        name: 'plate-detector',
        script: path.join(projectRoot, 'Car-Number-Plates-Detection-IA-Model-', 'indian_plate_detector_tesseract.py'),
        args: []
      },
      {
        name: 'rfid-bridge',
        script: path.join(__dirname, 'src', 'rfidGateBridge.py'),
        args: []
      }
    ];

    services.forEach(svc => {
      const startService = () => {
        try {
          console.log(`🔧 Spawning ${svc.name}: python3 ${svc.script}`);
          const proc = spawn('python3', [svc.script, ...svc.args], {
            cwd: path.dirname(svc.script),
            env: { ...process.env },
            stdio: ['ignore', 'pipe', 'pipe']
          });

          proc.stdout.on('data', (data) => {
            process.stdout.write(`[${svc.name} stdout] ${data}`);
          });
          proc.stderr.on('data', (data) => {
            process.stderr.write(`[${svc.name} stderr] ${data}`);
          });

          proc.on('exit', (code, signal) => {
            console.warn(`⚠️ ${svc.name} exited with code=${code} signal=${signal}. Restarting in 3s...`);
            setTimeout(startService, 3000);
          });

          proc.on('error', (err) => {
            console.error(`❌ Failed to start ${svc.name}:`, err);
            setTimeout(startService, 5000);
          });
        } catch (err) {
          console.error(`❌ Exception while starting ${svc.name}:`, err);
        }
      };

      startService();
    });
  } else {
    console.log('ℹ️ START_PY_SERVICES=false - skipping local Python service spawn');
  }

});
