const Claim = require("../models/claimModel");
const { v4: uuidv4 } = require('uuid');
const plateDetectionService = require('./plateDetectionService');
const Reservation = require("../models/reservationModel");
const Parking = require("../models/parkingModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { sendEmail } = require('../utils/SignUpMailVerif');
const { getClaimSubmittedTemplate, getClaimStatusUpdateTemplate } = require('../utils/claimNotificationTemplate');
const { getClaimAgainstVehicleTemplate } = require('../utils/claimNotificationToVehicleOwner');

const standardizePlateNumber = (plateText) => {
    if (!plateText) return null;

    const cleaned = plateText.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleaned) return null;

    const match = cleaned.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{2,5})$/);
    if (!match) return null;

    const [, state, rto, series, number] = match;
    return `${state}-${rto}-${series}-${number}`;
};

const normalizePlateForLookup = (plateText) => {
    if (!plateText) return null;
    return plateText.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const normalizePlateVariant = (plateText) => {
    const cleaned = normalizePlateForLookup(plateText);
    if (!cleaned) return null;

    const substitutions = {
        O: '0',
        Q: '0',
        I: '1',
        L: '1',
        S: '5',
        B: '8',
        G: '6',
        Z: '2'
    };

    return cleaned
        .split('')
        .map((char) => substitutions[char] || char)
        .join('');
};

const buildPlateLookupCandidates = (plateText) => {
    const raw = normalizePlateForLookup(plateText);
    const variant = normalizePlateVariant(plateText);
    const standardized = standardizePlateNumber(plateText);
    const standardizedNormalized = normalizePlateForLookup(standardized);

    return [...new Set([raw, variant, standardizedNormalized].filter(Boolean))];
};

const findVehicleOwnerByPlate = async (plateNumber) => {
    try {
        const searchCandidates = buildPlateLookupCandidates(plateNumber);
        if (searchCandidates.length === 0) {
            return null;
        }

        const users = await User.find({
            fastags: { $elemMatch: { vehiclePlate: { $exists: true, $ne: null } } }
        }).select('firstName lastName name email fastags role');

        for (const user of users) {
            for (const fastag of (user.fastags || [])) {
                const storedPlate = fastag?.vehiclePlate;
                if (!storedPlate) continue;

                const storedCandidates = buildPlateLookupCandidates(storedPlate);
                const exactMatch = searchCandidates.some(candidate => storedCandidates.includes(candidate));
                if (exactMatch) {
                    return {
                        userId: user._id,
                        name: user.firstName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Vehicle Owner',
                        email: user.email,
                        vehiclePlate: storedPlate,
                        fastagTagId: fastag.tagId || null
                    };
                }
            }
        }

        return null;
    } catch (error) {
        console.error('❌ Error finding vehicle owner by plate:', error);
        return null;
    }
};

// Helper function to calculate Levenshtein distance (edit distance)
const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
};

const findMatchingReservation = async (plateNumber) => {
    try {
        console.log('🔍 Searching for reservation with plate number:', plateNumber);
        
        // Normalize the search plate number (remove dashes, spaces, uppercase)
        const searchCandidates = buildPlateLookupCandidates(plateNumber);
        if (searchCandidates.length === 0) {
            console.log('❌ Plate number could not be normalized, skipping reservation lookup');
            return null;
        }
        console.log('🔍 Normalized search plate candidates:', searchCandidates);
        const activeStatuses = ['pending', 'active', 'accepted', 'confirmed', 'in-progress', 'completed'];
        
        // First try exact match (case-insensitive)
        let matchingReservation = await Reservation.findOne({
            matricule: { $regex: new RegExp('^' + plateNumber + '$', 'i') },
            status: { $in: activeStatuses }
        }).populate('parkingId', 'name location')
          .populate('userId', 'name email');

        // If not found, try normalized matching (without dashes/spaces)
        if (!matchingReservation) {
            console.log('🔍 Trying normalized plate matching...');
            
            // Get all active reservations
            const allReservations = await Reservation.find({
                status: { $in: activeStatuses }
            }).populate('parkingId', 'name location')
              .populate('userId', 'name email');
            
            // Find exact normalized match first, trying OCR variants.
            matchingReservation = allReservations.find(res => {
                if (!res.matricule) return false;
                const normalizedStoredPlate = normalizePlateForLookup(res.matricule);
                const normalizedStoredVariant = normalizePlateVariant(res.matricule);
                const matches = searchCandidates.some(candidate =>
                    candidate === normalizedStoredPlate || candidate === normalizedStoredVariant
                );

                if (matches) {
                    console.log(`✅ Normalized match found: "${res.matricule}" matches "${plateNumber}"`);
                }

                return matches;
            });
            
            // If still not found, try fuzzy matching (OCR errors like 1 vs 7, 0 vs O)
            if (!matchingReservation && allReservations.length > 0) {
                console.log('🔍 Trying fuzzy matching for OCR errors...');
                
                let bestMatch = null;
                let bestDistance = Infinity;
                const maxAllowedDistance = 2; // Allow up to 2 character differences
                
                for (const res of allReservations) {
                    if (!res.matricule) continue;
                    
                    const normalizedStoredPlate = normalizePlateForLookup(res.matricule);
                    const normalizedStoredVariant = normalizePlateVariant(res.matricule);
                    const distances = searchCandidates.map(candidate => Math.min(
                        levenshteinDistance(candidate, normalizedStoredPlate),
                        levenshteinDistance(candidate, normalizedStoredVariant)
                    ));
                    const distance = Math.min(...distances);
                    
                    if (distance <= maxAllowedDistance && distance < bestDistance) {
                        bestDistance = distance;
                        bestMatch = res;
                        console.log(`🎯 Fuzzy match candidate: "${res.matricule}" (distance: ${distance})`);
                    }
                }
                
                if (bestMatch) {
                    console.log(`✅ Fuzzy match found: "${bestMatch.matricule}" matches "${plateNumber}" (distance: ${bestDistance})`);
                    matchingReservation = bestMatch;
                }
            }
        }

        if (matchingReservation) {
            console.log('✅ Found matching reservation:', {
                id: matchingReservation._id,
                status: matchingReservation.status,
                matricule: matchingReservation.matricule,
                parkingName: matchingReservation.parkingId?.name
            });
        } else {
            console.log('❌ No reservation found for plate:', plateNumber);
            console.log('❌ Also tried normalized plate candidates:', searchCandidates);
        }

        return matchingReservation;
    } catch (error) {
        console.error('❌ Error finding matching reservation:', error);
        return null;
    }
};

const createClaim = async (req, res) => {
    try {
        if (!req.file || !req.body.description) {
            return res.status(400).json({ 
                message: !req.file ? "Image is required" : "Description is required" 
            });
        }

        const imageUrl = req.file.path;
        let plateNumber = null;
        let rawDetectedPlate = null;
        let plateDetectionResult = null;
        let reservationId = null;
        let reservationDetails = null;
        let vehicleOwnerMatch = null;
        let plateSource = null; // Track where the plate number came from
        
        // Check if manual plate number was provided
        if (req.body.manualPlateNumber && req.body.manualPlateNumber.trim()) {
            plateNumber = req.body.manualPlateNumber.trim().toUpperCase();
            plateSource = 'manual';
            console.log('📝 Using manual plate number:', plateNumber);
        } else {
            // Try automatic detection
            try {
                plateDetectionResult = await plateDetectionService.detectPlate(imageUrl);

                if (plateDetectionResult && plateDetectionResult.success && plateDetectionResult.plateText) {
                    plateNumber = plateDetectionResult.plateText;
                    rawDetectedPlate = plateDetectionResult.rawPlateText || plateDetectionResult.plateText;
                    plateSource = 'automatic';
                    console.log('📌 Auto-detected plate number:', plateNumber);
                } else {
                    console.log('⚠️ Automatic detection failed or returned UNKNOWN. Detection result:', plateDetectionResult);
                }
            } catch (detectionError) {
                console.error('❌ Plate detection error:', detectionError);
            }
        }
        
        // If we have a plate number (from either source), try to find matching reservation
        if (plateNumber) {
            try {
                const matchingReservation = await findMatchingReservation(plateNumber);
                
                if (matchingReservation) {
                    console.log('✅ Found matching reservation:', matchingReservation._id);
                    reservationId = matchingReservation._id;
                    reservationDetails = {
                        parkingName: matchingReservation.parkingId.name,
                        location: matchingReservation.parkingId.location,
                        startTime: matchingReservation.startTime,
                        endTime: matchingReservation.endTime
                    };
                } else {
                    console.log('⚠️ No matching reservation found for plate:', plateNumber);
                    vehicleOwnerMatch = await findVehicleOwnerByPlate(plateNumber);
                    if (vehicleOwnerMatch) {
                        console.log('✅ Found registered vehicle owner for plate:', {
                            userId: vehicleOwnerMatch.userId,
                            name: vehicleOwnerMatch.name,
                            plate: vehicleOwnerMatch.vehiclePlate
                        });
                    }
                }
            } catch (reservationError) {
                console.error('❌ Error finding reservation:', reservationError);
            }
        }

        // Debug: log the raw plate detection result to help trace missing plates
        console.log('🧾 plateDetectionResult before saving claim:', plateDetectionResult);

        const claim = new Claim({
            claimId: uuidv4(),
            userId: req.user._id,
            imageUrl: imageUrl,
            description: req.body.description,
            plateNumber: plateNumber,
            reservationId: reservationId,
            status: "Pending"
        });

        await claim.save();

        // Send email notification to the claim submitter (person who filed the claim)
        try {
            const user = await User.findById(req.user._id);
            if (user && user.email) {
                const claimDetails = {
                    claimId: claim.claimId,
                    plateNumber: plateNumber || 'Not detected',
                    parkingName: reservationDetails?.parkingName || 'N/A',
                    location: reservationDetails?.location || 'N/A',
                    description: req.body.description,
                    imageUrl: imageUrl
                };

                const emailHtml = getClaimSubmittedTemplate(
                    user.firstName || user.name || 'User',
                    claimDetails
                );

                await sendEmail({
                    to: user.email,
                    subject: `🚗 Claim Submitted Successfully - ${claim.claimId}`,
                    html: emailHtml
                });

                console.log('✅ Claim notification email sent to claimant:', user.email);
            }
        } catch (emailError) {
            console.error('❌ Failed to send claim notification email:', emailError);
            // Don't fail the claim creation if email fails
        }

        // Send email notification to the vehicle owner (person whose car was involved)
        if (plateNumber && (reservationId || vehicleOwnerMatch)) {
            try {
                let vehicleOwner = null;
                let parkingName = reservationDetails?.parkingName || 'N/A';
                let location = reservationDetails?.location || 'N/A';

                if (reservationId) {
                    const reservation = await Reservation.findById(reservationId)
                        .populate('userId', 'firstName name email')
                        .populate('parkingId', 'name location');

                    if (reservation && reservation.userId && reservation.userId.email) {
                        vehicleOwner = reservation.userId;
                        parkingName = reservation.parkingId?.name || parkingName;
                        location = reservation.parkingId?.location || location;
                    }
                } else if (vehicleOwnerMatch) {
                    vehicleOwner = vehicleOwnerMatch;
                }

                if (vehicleOwner && vehicleOwner.email) {
                    
                    // Don't send email if the vehicle owner is the same as the claimant
                    if (vehicleOwner.userId ? vehicleOwner.userId.toString() !== req.user._id.toString() : vehicleOwner._id?.toString() !== req.user._id.toString()) {
                        const claimant = await User.findById(req.user._id);
                        const claimantName = claimant ? 
                            `${claimant.firstName || claimant.name || 'A User'}` : 
                            'Another User';

                        const claimAgainstVehicleDetails = {
                            plateNumber: plateNumber,
                            claimId: claim.claimId,
                            claimantName: claimantName,
                            submittedDate: new Date().toLocaleDateString('en-IN', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            parkingName: parkingName,
                            location: location,
                            description: req.body.description,
                            imageUrl: imageUrl
                        };

                        const vehicleOwnerEmailHtml = getClaimAgainstVehicleTemplate(
                            vehicleOwner.firstName || vehicleOwner.name || 'Vehicle Owner',
                            claimAgainstVehicleDetails
                        );

                        await sendEmail({
                            to: vehicleOwner.email,
                            subject: `⚠️ Claim Registered Against Your Vehicle ${plateNumber} - ${claim.claimId}`,
                            html: vehicleOwnerEmailHtml
                        });

                        console.log('✅ Claim notification email sent to vehicle owner:', vehicleOwner.email);

                        // Create in-app notification for vehicle owner
                        try {
                            console.log('📝 Creating in-app notification with data:', {
                                ownerId: vehicleOwner.userId || vehicleOwner._id,
                                driverId: req.user._id,
                                claimId: claim._id,
                                plateNumber: plateNumber,
                                type: 'claim_against_vehicle'
                            });

                            const notification = new Notification({
                                ownerId: vehicleOwner.userId || vehicleOwner._id,
                                driverId: req.user._id, // The claimant
                                claimId: claim._id,
                                reservationId: reservationId,
                                parkingId: reservationId ? (await Reservation.findById(reservationId).select('parkingId')).parkingId : null,
                                type: 'claim_against_vehicle',
                                title: `Claim Against Your Vehicle ${plateNumber}`,
                                message: `A claim has been filed against your vehicle with plate number ${plateNumber}. Claim ID: ${claim.claimId}`,
                                plateNumber: plateNumber,
                                evidenceUrl: imageUrl,
                                isRead: false
                            });

                            await notification.save();
                            console.log('✅ In-app notification created successfully:', notification._id);

                            // Emit real-time notification via Socket.io
                            const io = req.app.get('io');
                            if (io) {
                                const socketRoomName = `user_${vehicleOwner.userId || vehicleOwner._id}`;
                                console.log('📡 Emitting Socket.io notification to room:', socketRoomName);
                                
                                io.to(socketRoomName).emit('newNotification', {
                                    ...notification.toObject(),
                                    driverId: {
                                        _id: req.user._id,
                                        name: claimantName,
                                        email: claimant?.email
                                    }
                                });
                                console.log('✅ Real-time notification sent via Socket.io to vehicle owner');
                            } else {
                                console.log('⚠️ Socket.io instance not found - real-time notification skipped');
                            }
                        } catch (notificationError) {
                            console.error('❌ Failed to create in-app notification:', notificationError);
                            console.error('Notification error stack:', notificationError.stack);
                            // Don't fail the claim creation if notification fails
                        }
                    } else {
                        console.log('ℹ️ Vehicle owner is the same as claimant - no separate notification sent');
                    }
                }
            } catch (vehicleOwnerEmailError) {
                console.error('❌ Failed to send email to vehicle owner:', vehicleOwnerEmailError);
                // Don't fail the claim creation if email fails
            }
        } else {
            console.log('ℹ️ No reservation found or plate not detected - vehicle owner notification skipped');
        }

        res.status(201).json({
            success: true,
            claim,
            plateDetected: !!plateNumber,
            rawDetectedPlate,
            plateSource: plateSource, // 'manual', 'automatic', or null
            reservationFound: !!reservationId || !!vehicleOwnerMatch,
            registeredVehicleFound: !!vehicleOwnerMatch,
            vehicleOwnerDetails: vehicleOwnerMatch ? {
                name: vehicleOwnerMatch.name,
                email: vehicleOwnerMatch.email,
                vehiclePlate: vehicleOwnerMatch.vehiclePlate
            } : null,
            reservationDetails: reservationDetails
        ,
            plateDetectionResult // include raw detector response for debugging
        });

    } catch (error) {
        console.error('Error in createClaim:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to create claim",
            error: error.message 
        });
    }
};

const getClaims = async (req, res) => {
    try {
        let claims;
        
        // Check if user is a Space_Owner
        if (req.user && req.user.role === 'Space_Owner') {
            // Find all parkings owned by this user
            const ownedParkings = await Parking.find({ Owner: req.user._id }).select('_id');
            const parkingIds = ownedParkings.map(p => p._id);
            
            // Find all reservations for these parkings
            const reservations = await Reservation.find({ 
                parkingId: { $in: parkingIds } 
            }).select('_id');
            const reservationIds = reservations.map(r => r._id);
            
            // Find claims linked to these reservations
            claims = await Claim.find({ 
                reservationId: { $in: reservationIds } 
            })
                .populate('userId', 'name email')
                .populate({
                    path: 'reservationId',
                    select: 'startTime endTime spotId parkingId matricule',
                    populate: {
                        path: 'parkingId',
                        select: 'name'
                    }
                });
        } else if (req.user && (req.user.role === 'Vehicle_Owner' || req.user.role === 'Driver')) {
            // Vehicle owners and drivers see only their own claims
            claims = await Claim.find({ userId: req.user._id })
                .populate('userId', 'name email')
                .populate({
                    path: 'reservationId',
                    select: 'startTime endTime spotId parkingId matricule',
                    populate: {
                        path: 'parkingId',
                        select: 'name location'
                    }
                })
                .sort({ createdAt: -1 });
        } else {
            // Admin or other roles see all claims
            claims = await Claim.find()
                .populate('userId', 'name email')
                .populate({
                    path: 'reservationId',
                    select: 'startTime endTime spotId parkingId matricule',
                    populate: {
                        path: 'parkingId',
                        select: 'name'
                    }
                });
        }
            
        res.status(200).json({
            success: true,
            claims,
            count: claims.length
        });
    } catch (error) {
        console.error('Error in getClaims:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const getClaimById = async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('reservationId', 'startTime endTime parkingSpotId');
            
        if (!claim) {
            return res.status(404).json({ 
                success: false,
                message: "Claim not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            claim
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const updateClaim = async (req, res) => {
    try {
        // Get the old claim first to check if status changed
        const oldClaim = await Claim.findById(req.params.id)
            .populate('userId', 'firstName name email')
            .populate({
                path: 'reservationId',
                select: 'parkingId',
                populate: {
                    path: 'parkingId',
                    select: 'name'
                }
            });

        if (!oldClaim) {
            return res.status(404).json({ 
                success: false,
                message: "Claim not found" 
            });
        }

        const updatedClaim = await Claim.findByIdAndUpdate(
            req.params.id, 
            req.body,
            { new: true, runValidators: true }
        ).populate('userId', 'firstName name email')
         .populate({
            path: 'reservationId',
            select: 'startTime endTime spotId parkingId',
            populate: {
                path: 'parkingId',
                select: 'name'
            }
        });

        // Send email notification if status changed
        if (req.body.status && req.body.status !== oldClaim.status) {
            try {
                const user = oldClaim.userId;
                if (user && user.email) {
                    const claimDetails = {
                        claimId: updatedClaim.claimId,
                        plateNumber: updatedClaim.plateNumber || 'N/A',
                        parkingName: updatedClaim.reservationId?.parkingId?.name || 'N/A',
                        statusMessage: req.body.statusMessage || req.body.rejectionReason || ''
                    };

                    const emailHtml = getClaimStatusUpdateTemplate(
                        user.firstName || user.name || 'User',
                        claimDetails,
                        req.body.status
                    );

                    await sendEmail({
                        to: user.email,
                        subject: `🚗 Claim Status Updated - ${updatedClaim.claimId}`,
                        html: emailHtml
                    });

                    console.log(`✅ Status update email sent to: ${user.email} (Status: ${req.body.status})`);
                }
            } catch (emailError) {
                console.error('❌ Failed to send status update email:', emailError);
                // Don't fail the update if email fails
            }
        }

        res.status(200).json({
            success: true,
            claim: updatedClaim
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const deleteClaim = async (req, res) => {
    try {
        const deletedClaim = await Claim.findByIdAndDelete(req.params.id);
        
        if (!deletedClaim) {
            return res.status(404).json({ 
                success: false,
                message: "Claim not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Claim deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const getClaimsByPlateNumber = async (req, res) => {
    try {
        const { plateNumber } = req.params;
        
        // Standardiser le format de la plaque d'immatriculation pour la recherche
        const standardizedPlate = standardizePlateNumber(plateNumber);
        
        // Rechercher les réclamations avec cette plaque
        const claims = await Claim.find({ plateNumber: standardizedPlate })
            .populate('userId', 'name email')
            .populate({
                path: 'reservationId',
                populate: {
                    path: 'parkingId',
                    select: 'name location'
                }
            })
            .sort({ createdAt: -1 });

        // Rechercher aussi les réservations associées
        const reservations = await Reservation.find({ 
            matricule: standardizedPlate,
            status: { $in: ['active', 'pending'] }
        }).populate('parkingId', 'name location');

        res.status(200).json({
            success: true,
            claims,
            reservations,
            plateNumber: standardizedPlate
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

module.exports = {
    createClaim,
    getClaims,
    getClaimById,
    updateClaim,
    deleteClaim,
    getClaimsByPlateNumber
};