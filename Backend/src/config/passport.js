const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel"); // Import User model

function isLocalHostUrl(value) {
    if (!value || typeof value !== "string") {
        return false;
    }

    try {
        const parsed = new URL(value);
        return (
            parsed.hostname === "localhost" ||
            parsed.hostname === "127.0.0.1" ||
            parsed.hostname.endsWith(".local") ||
            /^10\./.test(parsed.hostname) ||
            /^192\.168\./.test(parsed.hostname) ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(parsed.hostname)
        );
    } catch {
        return false;
    }
}

function resolveGoogleCallbackUrl() {
    const configuredUrl = process.env.GOOGLE_CALLBACK_URL;

    if (configuredUrl && /https?:\/\//.test(configuredUrl) && !isLocalHostUrl(configuredUrl)) {
        return configuredUrl;
    }

    return "/auth/google/callback";
}

// Register Google OAuth strategy only if credentials are provided.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Use an explicit absolute callback URL only if a valid HTTP(S) URL is provided.
    // Otherwise fall back to the standard relative callback path '/auth/google/callback'
    const googleCallbackUrl = resolveGoogleCallbackUrl();

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: googleCallbackUrl,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    let user = await User.findOne({
                        email: profile.emails[0].value
                    });


                    if (!user) {
                        // Split display name into first and last name
                        const names = profile.displayName.split(' ');
                        const firstName = names[0];
                        const lastName = names.length > 1 ? names.slice(1).join(' ') : '';
                        
                        // Generate a unique phone number based on timestamp and random digits
                        const timestamp = Date.now().toString().slice(-6);
                        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                        const uniquePhone = `91${timestamp}${random}`; // 91 for India prefix
                        
                        user = new User({         
                            firstName: firstName,
                            lastName: lastName,
                            email: profile.emails[0].value,
                            password: Math.random().toString(36).slice(-8), // Generate random password
                            phone: uniquePhone, // Unique phone number
                            role: 'Vehicle_Owner', // Default role
                            vehicleType: '2Wheeler', // Default vehicle type for Vehicle_Owner
                            status: 'Pending_Verification'
                        });
                        await user.save();
                    }

                    return done(null, user);
                } catch (err) {
                    console.error("Error saving user:", err);
                    return done(err, null);
                }
            }
        )
    );
    console.log(`GoogleStrategy registered. Using Google OAuth callback URL: ${googleCallbackUrl}`);
} else {
    console.log('Google OAuth not configured: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing. Skipping GoogleStrategy registration.');
}

// Serialize user to store in session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
