/**
 * Format currency values according to Indian Rupee (INR) format
 * @param {number} amount - The amount to format
 * @returns {string} Formatted amount in INR
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date according to Indian timezone and locale
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(new Date(date));
};

/**
 * Format phone numbers in Indian format
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  // Remove all non-numeric characters
  const cleaned = phone.toString().replace(/\D/g, '');
  
  // Check if it's a valid Indian phone number (10 digits)
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // Return original if not valid
  return phone;
};