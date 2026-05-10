const express = require("express");
const jwt = require("jsonwebtoken");
const { signup, login, verifyOTP } = require("../controllers/authController");
const router = express.Router();
const passport = require("passport");
require("dotenv").config(); // Load environment variables

// Import User Model
const User = require("../models/userModel");

// Existing Authentication Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);

// Register Google routes only when Google OAuth is configured.
const hasGoogleConfig = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

// Helper to compute the effective Google callback URL for the current request.
// If an absolute GOOGLE_CALLBACK_URL is provided it will be used. Otherwise
// the effective callback will be constructed from the incoming request so it
// matches the redirect_uri that passport/google will use when a relative
// callback path is configured.
function computeCallbackUrl(req) {
  if (process.env.GOOGLE_CALLBACK_URL && /https?:\/\//.test(process.env.GOOGLE_CALLBACK_URL)) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  // Use the incoming request's protocol and host to build the callback URL
  // when only a relative path is configured (passport uses the request host).
  const host = req.get("host");
  const protocol = req.protocol;
  return `${protocol}://${host}/auth/google/callback`;
}
if (hasGoogleConfig) {
  // Google Login Route
  router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // Google Callback Route
  router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      if (!req.user) {
        return res.redirect("http://localhost:3000?error=Unauthorized");
      }

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is missing; cannot generate token for Google callback.");
        return res.status(500).send("Server misconfiguration: JWT_SECRET not set");
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: req.user.phone,
          vehicleType: req.user.vehicleType,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Redirect to frontend with token
      res.redirect(`http://localhost:3000/google/callback?token=${token}`);
    }
  );
} else {
  // Provide friendly 501 responses when Google is not configured
  router.get("/google", (req, res) => {
    res.status(501).json({ message: "Google OAuth not configured on this server." });
  });

  router.get("/google/callback", (req, res) => {
    res.status(501).json({ message: "Google OAuth not configured on this server." });
  });
}

// Informational endpoint to show OAuth config and callback URL to copy into Google
// Cloud Console. This is intentionally read-only and safe to expose on dev hosts.
router.get("/info", (req, res) => {
  try {
    const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const callbackUrl = googleConfigured ? computeCallbackUrl(req) : null;
    res.json({
      googleConfigured,
      callbackUrl,
      googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    });
  } catch (err) {
    console.error("Error in /auth/info:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 🔥 NEW: Generate Token for Face Recognition 🔥
router.post("/getToken", async (req, res) => {
  const { userId } = req.body;

  try {
    // Find user in database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        vehicleType: user.vehicleType,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get Logged-In User
router.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

// Logout Route
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out successfully" });
  });
});

module.exports = router;
