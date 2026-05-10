const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Flask API settings with environment variable support for Docker/hosting
const FLASK_URL = process.env.PLATE_DETECTOR_API_URL || 'http://localhost:5001/detect_plate';
const FALLBACK_MODE_ENABLED = process.env.PLATE_DETECTOR_FALLBACK_ENABLED !== 'false';

class PlateDetectionService {
    constructor() {
        console.log('🌐 Plate Detection Service initializing');
        console.log(`🌐 Using Flask API URL: ${FLASK_URL}`);
        this.apiIsDown = false;
        this.lastHealthCheck = 0;
        this.healthCheckInterval = 60000; // 1 minute
    }

    async initialize() {
        console.log('🔍 Initializing PlateDetectionService');
        try {
            await this.checkApiAvailability();
            console.log('✅ Plate detection service initialized successfully');
        } catch (error) {
            console.error('⚠️ Flask API not reachable:', error.message);
            console.log('ℹ️ Will retry when processing requests');
            this.apiIsDown = true;
        }
    }

    async checkApiAvailability() {
        try {
            // Avoid too frequent health checks
            const now = Date.now();
            if (now - this.lastHealthCheck < this.healthCheckInterval) {
                return !this.apiIsDown;
            }

            this.lastHealthCheck = now;

            // Try the health endpoint with a few retries (network can be flaky)
            const healthUrl = FLASK_URL.replace('/detect_plate', '/health');
            const maxHealthAttempts = 3;
            let attempt = 0;
            let lastErr = null;

            while (attempt < maxHealthAttempts) {
                attempt++;
                try {
                    console.log(`🔎 Health check attempt ${attempt}/${maxHealthAttempts} -> ${healthUrl}`);
                    const response = await axios.get(healthUrl, { timeout: 15000 }); // 15s timeout per attempt
                    if (response && response.status === 200) {
                        this.apiIsDown = false;
                        return true;
                    }
                    lastErr = new Error(`Unexpected status code ${response ? response.status : 'no-response'}`);
                } catch (err) {
                    lastErr = err;
                    console.warn(`⚠️ Health attempt ${attempt} failed: ${err.message}`);
                    // small backoff before retry
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }

            console.warn(`⚠️ Flask API health check failed after ${maxHealthAttempts} attempts: ${lastErr && lastErr.message}`);
            this.apiIsDown = true;
            return false;
        } catch (error) {
            console.warn(`⚠️ Flask API health check unexpected error: ${error.message}`);
            this.apiIsDown = true;
            return false;
        }
    }

    async downloadImage(imageUrl) {
        try {
            const response = await axios({
                url: imageUrl,
                responseType: 'arraybuffer',
                timeout: 10000 // 10 second timeout for image download
            });
            return Buffer.from(response.data);
        } catch (error) {
            console.error('❌ Image download failed:', error.message);
            throw new Error(`Failed to download image: ${error.message}`);
        }
    }

    standardizeIndianPlate(plateText) {
        if (!plateText) return null;

        console.log("Standardizing Indian plate text:", plateText);

        // Remove all non-alphanumeric noise (including dashes/spaces) and normalize.
        let cleanText = plateText.replace(/[\u0600-\u06FF]/g, '').trim();
        cleanText = cleanText.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        console.log("Cleaned plate text:", cleanText);
        
        // Indian plate pattern: XX00XX0000 or XX-00-XX-0000
        // Try to extract components
        const indianPattern = /([A-Z]{2})(\d{1,2})([A-Z]{1,2})(\d{1,4})/;
        const match = cleanText.match(indianPattern);
        
        if (match) {
            const [, state, rto, series, number] = match;
            const formatted = `${state}-${rto}-${series}-${number}`;
            console.log("Formatted Indian plate:", formatted);
            return formatted;
        }
        
        // If pattern doesn't match, reject it instead of propagating OCR noise.
        console.log("Pattern not matched, rejecting OCR text:", cleanText);
        return null;
    }

    async detectPlate(imageUrl) {
        let retries = 0;
        const maxRetries = 2;
        
        // Check API availability first to avoid unnecessary retries
        const isApiUp = await this.checkApiAvailability();
        if (!isApiUp && FALLBACK_MODE_ENABLED) {
            console.log('⚠️ API is down, using fallback detection mode');
            // Return a simplified response that lets the client know this is a fallback
            return {
                success: false,
                plateText: null,
                rawPlateText: null,
                confidence: 0.1,
                noPlateDetected: true,
                fallbackMode: true,
                apiAvailable: false
            };
        }
        
        while (retries <= maxRetries) {
            try {
                console.log('🔄 Processing image from URL:', imageUrl);
                
                // Get image buffer
                const imageBuffer = await this.downloadImage(imageUrl);
                
                // Create FormData for multipart upload
                const FormData = require('form-data');
                const formData = new FormData();
                formData.append('image', imageBuffer, {
                    filename: 'plate.jpg',
                    contentType: 'image/jpeg'
                });
                
                // Call Flask API with timeout
                console.log('🌐 Sending request to Flask API...');
                const response = await axios.post(FLASK_URL, formData, {
                    headers: { 
                        ...formData.getHeaders()
                    },
                    timeout: 45000,  // Increased timeout to 45 seconds
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });

                const result = response.data;
                console.log('📊 API Response:', result);
                
                // Handle the new API response format
                if (result.error) {
                    console.error('❌ API returned error:', result.error);
                    return {
                        success: false,
                        plateText: null,
                        rawPlateText: null,
                        confidence: 0,
                        noPlateDetected: true
                    };
                }

                // Extract plate number from new format
                const plateText = result.plate_number || "";
                const confidence = result.confidence || 0;
                const normalizedPlate = result.normalized_plate || null;
                const candidates = Array.isArray(result.candidates) ? result.candidates : [];
                
                console.log(`Raw plate text from API: "${plateText}"`);
                console.log(`Confidence: ${confidence}`);
                
                // Check if detection failed
                if (plateText === 'UNKNOWN' || !plateText) {
                    return {
                        success: false,
                        plateText: null,
                        rawPlateText: plateText,
                        confidence: confidence,
                        noPlateDetected: true
                    };
                }
                
                // Prefer the detector's normalized plate if available.
                const standardizedPlateText = this.standardizeIndianPlate(normalizedPlate || plateText);

                // Reject only clearly invalid/very-low-confidence detections.
                // Real detector responses in this project often return 0.6-1.0 for valid plates.
                if (!standardizedPlateText || confidence < 0.5) {
                    console.log('⚠️ Rejecting low-confidence or invalid plate detection:', {
                        plateText,
                        normalizedPlate,
                        confidence,
                        candidates
                    });
                    return {
                        success: false,
                        plateText: null,
                        rawPlateText: plateText || null,
                        confidence,
                        noPlateDetected: true,
                        invalidPlate: true,
                        candidates
                    };
                }
                
                console.log('Original plate text:', plateText);
                console.log('Standardized Indian plate text:', standardizedPlateText);

                return {
                    success: true,
                    plateText: standardizedPlateText,
                    rawPlateText: plateText,
                    normalizedPlate,
                    candidates,
                    confidence: confidence,
                    fullOutput: JSON.stringify(result)
                };

            } catch (error) {
                retries++;
                // Log more diagnostic info to help debugging network/API issues
                console.error(`❌ Plate detection failed (attempt ${retries}/${maxRetries+1}):`, error.message);
                if (error.response) {
                    console.error('   ↳ Response status:', error.response.status);
                    console.error('   ↳ Response data:', error.response.data);
                }
                if (error.request && !error.response) {
                    console.error('   ↳ No response received. Request info:', { headers: error.request && error.request._header });
                }
                
                // If 5xx errors, mark API as potentially down
                if (error.response && error.response.status >= 500) {
                    this.apiIsDown = true;
                }
                
                // Wait before retry with exponential backoff
                if (retries <= maxRetries) {
                    const waitTime = 2000 * Math.pow(2, retries-1); // 2s, 4s, 8s...
                    console.log(`⏱️ Waiting ${waitTime}ms before retry ${retries}...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else if (FALLBACK_MODE_ENABLED) {
                    console.log('⚠️ All retries failed, using fallback mode');
                    // After all retries failed, return a fallback that clients can handle
                    return {
                        success: false,
                        plateText: null,
                        rawPlateText: null, 
                        confidence: 0.1,
                        noPlateDetected: true,
                        fallbackMode: true,
                        error: error.message
                    };
                } else {
                    throw new Error(`Failed to detect license plate after ${maxRetries+1} attempts: ${error.message}`);
                }
            }
        }
    }

    async runDiagnostics() {
        try {
            // Check if Flask API health endpoint is accessible
            const healthUrl = FLASK_URL.replace('/detect_plate', '/health');
            let status = 'unavailable';
            try {
                const response = await axios.get(healthUrl, { timeout: 15000 });
                if (response && response.status === 200) status = 'available';
            } catch (err) {
                status = 'unavailable';
            }

            return {
                status,
                apiUrl: FLASK_URL,
                apiIsMarkedDown: this.apiIsDown,
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                apiUrl: FLASK_URL,
                lastChecked: new Date().toISOString()
            };
        }
    }
}

module.exports = new PlateDetectionService();
