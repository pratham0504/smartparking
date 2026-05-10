/**
 * Utility functions for date handling with Indian timezone support
 */

// Get current date-time in Indian timezone
const getCurrentDateTime = () => {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

// Convert any date to Indian timezone
const toIndianTimezone = (date) => {
  return new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

// Create a new Date object in Indian timezone
const createDateInIndianTimezone = () => {
  return new Date(getCurrentDateTime());
};

module.exports = {
  getCurrentDateTime,
  toIndianTimezone,
  createDateInIndianTimezone
};