// Phone number validation for Indian numbers
const validateIndianPhoneNumber = (phone) => {
  const phonePattern = /^(?:\+91[\-\s]?|0)?[6-9]\d{9}$/;
  return phonePattern.test(phone);
};

// Email validation
const validateEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

// Input validation middleware
const validateSignupInput = (req, res, next) => {
  const { firstName, lastName, email, password, phone, role } = req.body;

  // Check required fields
  if (!firstName || !lastName || !email || !password || !phone || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Validate email format
  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }

  // Validate Indian phone number
  if (!validateIndianPhoneNumber(phone)) {
    return res.status(400).json({ error: "Please enter a valid Indian mobile number" });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long" });
  }

  // Valid roles
  const validRoles = ["Vehicle_Owner", "Space_Owner", "Business"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role selected" });
  }

  next();
};

module.exports = {
  validateSignupInput,
  validateIndianPhoneNumber,
  validateEmail
};