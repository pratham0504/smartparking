const mongoose = require('mongoose');
require('dotenv').config();

// Get MongoDB URI from environment variables
const MONGO_ATLAS_URI = process.env.MONGO_ATLAS_URI;

const connectDB = async () => {
  try {
    // Always use the Atlas URI - never try to connect to localhost/Docker
    if (!MONGO_ATLAS_URI) {
      throw new Error('MongoDB connection string not found in environment variables');
    }

    console.log('Attempting to connect to MongoDB Atlas...');

    const conn = await mongoose.connect(MONGO_ATLAS_URI, {
      serverSelectionTimeoutMS: 5000, // Optional: Keep for faster feedback on connection issues
      socketTimeoutMS: 45000, // Optional: Default is usually fine
    });

    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Export both the connection function and the URI for use elsewhere
module.exports = connectDB;
module.exports.MONGO_ATLAS_URI = MONGO_ATLAS_URI;