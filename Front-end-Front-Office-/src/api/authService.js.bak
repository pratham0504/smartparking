
// Function to validate the token format
export const isValidTokenFormat = (token) => {
    // Basic format validation - alphanumeric characters
    const tokenFormat = /^[A-Za-z0-9-_]+$/;
    return tokenFormat.test(token) && token.length === 40; // SHA-1 tokens are 40 characters
};

// List of valid tokens for testing (you would replace this with actual backend validation)
const validTokens = [
    'e405319cb8f19fc3828c3f024c6f3391b961a6cb'
];

// Function to verify the reset token
export const verifyResetToken = async (token) => {
    try {
        // For development: Use a mock implementation instead of making an actual API call
        console.log('Using mock token verification for token:', token);
        
        // This more strict mock validates both format and if it's in our valid tokens list
        if (isValidTokenFormat(token) && validTokens.includes(token)) {
            console.log('Token is valid');
            return { valid: true };
        } else {
            console.log('Token is invalid');
            return { valid: false };
        }
        
        // When backend is ready, uncomment this:
        // const response = await axios.get(`http://localhost:3001/api/verify-reset-token/${token}`);
        // return response.data;
    } catch (error) {
        console.error('Error verifying token:', error);
        return { valid: false };
    }
};
