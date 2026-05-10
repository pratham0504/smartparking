const jwt = require("jsonwebtoken");

// Validate secret exists on startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("CRITICAL ERROR: JWT_SECRET is missing from .env file!");
}

exports.generateToken = (user) => {
  // Use a consistent payload. Note: user._id is converted to String for safety.
  return jwt.sign(
    { 
      id: String(user._id), 
      role: user.role,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

exports.authenticateToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    // Return null or throw custom error so middleware can handle 401 response
    return null; 
  }
};