const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");
const { generateToken } = require("../utils/token");
const { validateIndianPhoneNumber, validateEmail } = require("../middleware/validationMiddleware");

// Fonction pour générer un OTP aléatoire
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Temporary storage for registration data
const tempUsers = new Map();

// User Registration
exports.signup = async (req, res) => {
  const { firstName, lastName, email, password, phone, role, vehicleType } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { phone }] });
    if (user) {
      if (user.email === email) {
        return res.status(400).json({ error: "Email address is already registered" });
      }
      if (user.phone === phone) {
        return res.status(400).json({ error: "Mobile number is already registered" });
      }
    }

    // Validate phone number format
    if (!validateIndianPhoneNumber(phone)) {
      return res.status(400).json({ error: "Please enter a valid Indian mobile number" });
    }

    // Hash password and generate OTP
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store user data temporarily
    const userData = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone: phone.replace(/[\s\-]/g, ''),
      role,
      vehicleType,
      otp,
      otpExpires,
      countryCode: '+91',
      preferredLanguage: 'en-IN',
      timezone: 'Asia/Kolkata'
    };
    
    // Store in temporary Map
    tempUsers.set(email, userData);

    // Send OTP via email
    await sendEmail({
      email,
      subject: "Welcome to parkEz - Verify Your Mobile Number",
      message: `Welcome to parkEz!\n\nYour mobile verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.\n\nBest regards,\nTeam parkEz`,
    });

    res.status(200).json({ message: "User created, OTP code sent" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// User Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  // Support login with either email or phone number
  const isPhone = email.match(/^(\+91[\-\s]?|0)?[6-9]\d{9}$/);
  const query = isPhone ? { phone: email } : { email };

  try {
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ 
        error: isPhone 
          ? "No account found with this mobile number" 
          : "No account found with this email address"
      });
    }

    if (user.status === "Blocked") {
      return res.status(403).json({ 
        error: "Your account has been blocked. Please contact our support team for assistance.",
        supportEmail: "support@parkEz.in"
      });
    }

    // Auto-verify user on first login if pending verification
    if (user.status === "Pending_Verification") {
      await User.updateOne(
        { _id: user._id },
        { $set: { status: "Active" } }
      );
      user.status = "Active"; // Update the in-memory object
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: "Invalid password. Please try again or use 'Forgot Password' to reset."
      });
    }

    // Generate JWT token and log user in directly
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        phone: user.phone 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ 
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        image: user.image,
        status: user.status
      }
    });
  } catch (error) {
    console.error("❌ Error during login:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// ➤ Vérification OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  console.log("Request received with:", { email, otp });

  try {
    // Get temporary user data
    const userData = tempUsers.get(email);
    if (!userData) {
      console.log("Temporary user data not found!");
      return res.status(404).json({ error: "Registration session expired. Please register again." });
    }

    if (userData.otp !== otp) {
      console.log("Invalid OTP:", userData.otp, "provided:", otp);
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (new Date() > userData.otpExpires) {
      console.log("OTP expired!");
      tempUsers.delete(email);
      return res.status(400).json({ error: "OTP code has expired" });
    }

    // Create and save the actual user
    const user = new User({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      role: userData.role,
      vehicleType: userData.vehicleType,
      countryCode: userData.countryCode,
      preferredLanguage: userData.preferredLanguage,
      timezone: userData.timezone
    });

    await user.save();
    
    // Clear temporary data
    tempUsers.delete(email);
    user.otpExpires = null;
    await user.save();

    const token = generateToken(user);
    res.status(200).json({ message: "Authentication successful", token });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
