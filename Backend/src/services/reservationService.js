const Reservation = require("../models/reservationModel");

const Parking = require('../models/parkingModel');
const notificationService = require('../controllers/notificationController'); // Assurez-vous que le chemin est correct
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const { isValidObjectId } = require('mongoose');
const Notification = require('../models/notificationModel'); // Assurez-vous que le chemin est correct
const Slot = require('../models/slotModel');
const { emitParkingUpdate } = require('../utils/parkingRealtime');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // Add crypto module
const { getReservationConfirmationTemplate, getReservationRejectionTemplate } = require('../utils/reservationMailTemplate');

const ACTIVE_RESERVATION_STATUSES = ['pending', 'accepted', 'confirmed', 'active', 'in-progress'];
const EMERGENCY_PURPOSES = ['ambulance', 'fire', 'police', 'medical', 'other'];
const EXPIRY_CLEANUP_INTERVAL_MS = Number(process.env.RESERVATION_EXPIRY_CHECK_INTERVAL_MS || 60000);

let expiryCleanupTimer = null;

const parseSpotNumber = (spotId) => {
  const match = (spotId || '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

const isNearCurrentTime = (start) => {
  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return false;
  return startMs - Date.now() <= 30 * 60000;
};

const findOverlappingReservations = async ({ parkingId, spotId, start, end }) => {
  return Reservation.find({
    parkingId,
    spotId,
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });
};

const validateEmergencyPolicy = ({ spot, reservationData }) => {
  const isEmergencyRequest = !!reservationData.isEmergency;
  const purpose = reservationData.emergencyPurpose;

  if (spot.type === 'emergency' && !isEmergencyRequest) {
    throw new Error('This slot is reserved for emergency use (ambulance/fire/police). Please choose another slot.');
  }

  if (isEmergencyRequest) {
    if (spot.type !== 'emergency') {
      throw new Error('Emergency reservations must use an emergency slot.');
    }

    if (!purpose || !EMERGENCY_PURPOSES.includes(String(purpose).toLowerCase())) {
      throw new Error('Please provide a valid emergency purpose (ambulance, fire, police, medical, other).');
    }
  }
};

const checkNearNowPhysicalAvailability = async ({ parking, parkingId, spotId, start, reservationData }) => {
  if (!isNearCurrentTime(start)) {
    return;
  }

  const spotNumber = parseSpotNumber(spotId);
  const parkingIdStr = String(parkingId);

  if (spotNumber !== null) {
    const selectedSlot = await Slot.findOne({ parkingId: parkingIdStr, slotNumber: spotNumber });
    if (selectedSlot && selectedSlot.isOccupied) {
      throw new Error('This slot is currently occupied. Please try different timing.');
    }
  }

  const physicalSlots = await Slot.find({ parkingId: parkingIdStr });
  if (!physicalSlots.length) {
    return;
  }

  const spotIdsByType = (parking.spots || [])
    .filter((s) => reservationData.isEmergency ? s.type === 'emergency' : s.type !== 'emergency')
    .map((s) => s.id);

  const targetSpotNumbers = new Set(
    spotIdsByType
      .map(parseSpotNumber)
      .filter((n) => Number.isInteger(n))
  );

  if (!targetSpotNumbers.size) {
    return;
  }

  const relevantPhysicalSlots = physicalSlots.filter((s) => targetSpotNumbers.has(s.slotNumber));
  if (!relevantPhysicalSlots.length) {
    return;
  }

  const allOccupied = relevantPhysicalSlots.every((s) => s.isOccupied === true);
  if (allOccupied) {
    throw new Error('Slots are full right now. Please try different timing.');
  }
};

const syncParkingSpotState = async (reservation, nextStatus) => {
  const parking = await Parking.findById(reservation.parkingId);

  if (!parking) {
    return null;
  }

  const spotIndex = Array.isArray(parking.spots)
    ? parking.spots.findIndex((spot) => spot.id === reservation.spotId)
    : -1;

  if (spotIndex === -1) {
    return parking;
  }

  const spot = parking.spots[spotIndex];
  const wasAvailable = spot.status === 'available';

  if (nextStatus === 'accepted') {
    spot.status = 'reserved';
    spot.reservedBy = reservation.userId;
    spot.reservationTime = new Date();

    if (wasAvailable) {
      parking.availableSpots = Math.max(0, parking.availableSpots - 1);
    }
  } else if (['rejected', 'canceled'].includes(nextStatus)) {
    if (spot.status === 'reserved' && String(spot.reservedBy || '') === String(reservation.userId)) {
      spot.status = 'available';
      spot.reservedBy = null;
      spot.reservationTime = null;
      parking.availableSpots = Math.min(parking.totalSpots, parking.availableSpots + 1);
    }
  }

  await parking.save({ validateBeforeSave: false });
  return parking;
};


const calculatePrice = (startTime, endTime, pricing) => {
  const hours = Math.ceil(
    (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)
  );
  let days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let totalPrice = 0;

  if (days >= 30 && pricing.monthly) {
    const months = Math.floor(days / 30);
    totalPrice += months * pricing.monthly;
    days = days % 30;
  }

  if (days >= 7 && pricing.weekly) {
    const weeks = Math.floor(days / 7);
    totalPrice += weeks * pricing.weekly;
    days = days % 7;
  }

  if (days > 0 && pricing.daily) {
    totalPrice += days * pricing.daily;
  }

  if (remainingHours > 0) {
    totalPrice += remainingHours * pricing.hourly;
  }

  return totalPrice;
};

const generateQRCode = async (reservationData) => {
  const qrData = JSON.stringify({
    reservationId: reservationData._id,
    parkingName: reservationData.parkingId.name,
    driverName: reservationData.userId.name,
    startTime: reservationData.startTime,
    endTime: reservationData.endTime,
    totalPrice: reservationData.totalPrice,
    vehicleType: reservationData.vehicleType,
  });

  return await QRCode.toDataURL(qrData);
};

/**
 * Vérifie le statut réel d'une place de parking en tenant compte des réservations
 * @param {String} spotId - L'ID de la place de parking
 * @param {String} currentStatus - Le statut actuel de la place dans la base de données
 * @returns {Promise<String>} - Le statut réel de la place: 'available', 'occupied', ou 'reserved'
 */
const checkRealSpotStatus = async (spotId, currentStatus) => {
  try {
    // Obtenir l'heure actuelle
    const now = new Date();

    // Chercher la réservation active ou prochaine pour cette place
    const activeReservation = await Reservation.findOne({
      spotId: spotId,
      status: "accepted",
      endTime: { $gte: now }, // La réservation n'est pas encore terminée
      $or: [
        { startTime: { $lte: now } }, // La réservation a déjà commencé
        { startTime: { $lte: new Date(now.getTime() + 30 * 60000) } }, // La réservation commence dans moins de 30 min
      ],
    }).sort({ startTime: 1 }); // Trier par heure de début pour obtenir la plus proche

    // Si aucune réservation n'est trouvée, la place est disponible
    if (!activeReservation) {
      return "available";
    }

    // Calculer la différence en minutes entre maintenant et le début de la réservation
    const minutesUntilStart = Math.floor(
      (activeReservation.startTime - now) / 60000
    );

    // Si la réservation a déjà commencé (entre startTime et endTime)
    if (
      now >= activeReservation.startTime &&
      now <= activeReservation.endTime
    ) {
      return "reserved";
    }

    // Si la réservation commence dans moins de 30 minutes
    if (minutesUntilStart <= 30) {
      return "occupied";
    }

    // Dans les autres cas, la place est disponible
    return "available";
  } catch (error) {
    console.error(
      "Erreur lors de la vérification du statut de la place:",
      error
    );
    // En cas d'erreur, on retourne le statut actuel pour ne pas bloquer le système
    return currentStatus;
  }
};

const createReservation = async (reservationData) => {
  try {
    console.log("Creating reservation with data:", reservationData);

    // Vérifier la disponibilité du parking
    const parking = await Parking.findById(reservationData.parkingId);
    if (!parking) {

      

      throw new Error('Parking not found');

    }

    const start = new Date(reservationData.startTime);
    const end = new Date(reservationData.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new Error('Invalid reservation timing');
    }

    const spot = Array.isArray(parking.spots)
      ? parking.spots.find((s) => s.id === reservationData.spotId)
      : null;
    if (!spot) {
      throw new Error('Selected slot does not exist in this parking');
    }

    if (spot.status === 'maintenance') {
      throw new Error('Selected slot is under maintenance. Please choose another slot.');
    }

    validateEmergencyPolicy({ spot, reservationData });

    const overlappingReservations = await findOverlappingReservations({
      parkingId: reservationData.parkingId,
      spotId: reservationData.spotId,
      start,
      end
    });

    if (overlappingReservations.length > 0) {
      throw new Error('This slot is already booked for the selected time. Please try different timing.');
    }

    await checkNearNowPhysicalAvailability({
      parking,
      parkingId: reservationData.parkingId,
      spotId: reservationData.spotId,
      start,
      reservationData
    });

    const reservation = new Reservation({
      parkingId: reservationData.parkingId,
      spotId: reservationData.spotId,
      userId: reservationData.userId,
      startTime: reservationData.startTime,
      endTime: reservationData.endTime,
      vehicleType: reservationData.vehicleType,
      totalPrice: reservationData.totalPrice,

    

      matricule: reservationData.matricule,
      isEmergency: !!reservationData.isEmergency,
      emergencyPurpose: reservationData.isEmergency
        ? String(reservationData.emergencyPurpose || '').toLowerCase()
        : null,
      paymentMethod: reservationData.paymentMethod || 'cash',
      status: 'pending'

    });

    // Générer le QR code après la sauvegarde initiale
    await reservation.save();

    const qrCodeData = JSON.stringify({
      id: reservation._id.toString(),
      parkingName: parking.name,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      vehicleType: reservation.vehicleType,
      totalPrice: reservation.totalPrice,
    });

    reservation.qrCode = await QRCode.toDataURL(qrCodeData);
    await reservation.save();
    console.log("parking dataaa ", parking);

    // Get owner ID correctly (it might be an object or string)
    const ownerId = parking.Owner?._id || parking.Owner || parking.get?.("Owner");

    // Create a pending notification for owner approval
    await notificationService.createNotificationDirectly({
      driverId: reservationData.userId,
      ownerId: ownerId,
      parkingId: reservationData.parkingId,
      reservationId: reservation._id,
      status: "en_attente",  // Request owner approval
    });

    console.log("✅ Reservation created successfully (pending owner approval):", reservation._id);
    return reservation;
  } catch (error) {
    console.error("❌ Error creating reservation:", error);
    throw error;
  }
};

// Function to generate random rejection reasons
const getRandomRejectionReason = () => {
  const reasons = [
    "The parking spot requires urgent maintenance during the requested period.",
    "Construction work is scheduled in this parking area on these dates.",
    "This spot is reserved for a special event.",
    "The specified vehicle is not compatible with this spot's dimensions.",
    "The owner has specific restrictions for this period.",
    "This spot is temporarily unavailable for safety reasons.",
    "The vehicle type is not suitable for this parking spot.",
    "Modifications are planned for this parking spot.",
    "The owner has prior commitments for this period.",
    "The parking area is under renovation to improve safety.",
    "A technical issue with the access system requires maintenance.",
    "Adverse weather conditions require temporary closure.",
    "A major local event requires this spot for emergency services.",
    "Ground marking work is scheduled in this section.",
    "A safety inspection is scheduled during this period.",
    "The surveillance system is being upgraded.",
    "Environmental control measures are ongoing in this area.",
    "The spot configuration does not match the specified vehicle type."
  ];
  
  // Sélectionner 3 raisons aléatoires différentes
  let selectedReasons = [];
  let availableReasons = [...reasons];
  
  for (let i = 0; i < 3; i++) {
    if (availableReasons.length === 0) break;
    // Use cryptographically secure random number generator
    const randomIndex = crypto.randomInt(0, availableReasons.length);
    selectedReasons.push(availableReasons[randomIndex]);
    availableReasons.splice(randomIndex, 1);
  }
  
  // Formater les raisons avec des puces et retours à la ligne HTML
  return selectedReasons
    .map((reason, index) => `${index + 1}. ${reason}`)
    .join('<br><br>');
};

// Function to update reservation status
async function updateReservationStatus(reservationId, newStatus, userId) {
  if (!mongoose.Types.ObjectId.isValid(reservationId)) {

    throw new Error('Invalid reservation ID');
  }

  const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'canceled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid reservation status');

  }

  // Récupérer les informations complètes de la réservation
  const reservation = await Reservation.findById(reservationId)
    .populate('userId')
    .populate('parkingId');

  if (!reservation) {

    throw new Error('Reservation not found');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true, // Enforce SSL/TLS connection
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  if (newStatus === 'accepted') {
    // Rejeter les réservations qui se chevauchent
    const overlappingReservations = await Reservation.find({
      _id: { $ne: reservationId },
      parkingId: reservation.parkingId,
      spotId: reservation.spotId,
      status: { $in: ['pending', 'accepted'] },
      $or: [
        {
          startTime: { $lt: reservation.endTime },
          endTime: { $gt: reservation.startTime }
        }
      ]
    }).populate('userId').populate('parkingId');

    // Rejeter et envoyer des e-mails pour toutes les réservations qui se chevauchent
    for (const overlap of overlappingReservations) {
      overlap.status = 'rejected';
      await overlap.save();
      
      await Notification.findOneAndUpdate(
        { reservationId: overlap._id },
        { 
          status: 'refusée',
          isRead: false
        },
        { new: true }
      );

      // Send email for each automatically rejected reservation
      const rejectionMailOptions = {
        from: process.env.EMAIL_USER,
        to: overlap.userId.email,
        subject: '❌ Your Reservation Could Not Be Confirmed',
        html: getReservationRejectionTemplate(
          overlap.userId.name,
          overlap.parkingId.name,
          overlap.startTime,
          overlap.endTime,
          overlap.spotId,
          "Another reservation has been confirmed for this time slot."
        )
      };

      try {
        await transporter.sendMail(rejectionMailOptions);
        console.log(`Rejection email sent to ${overlap.userId.email}`);
      } catch (error) {
        console.error('Error sending rejection email:', error);
      }
    }

    // Génération du QR code en base64
    const qrData = JSON.stringify({
      reservationId: reservation._id,
      parkingName: reservation.parkingId.name,
      driverName: reservation.userId.name,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      totalPrice: reservation.totalPrice,
      vehicleType: reservation.vehicleType
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    // Extraire seulement la partie base64 de l'URL de données
    const base64QR = qrCodeDataUrl.split(',')[1];

    // Préparer et envoyer l'email avec l'image QR intégrée
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: reservation.userId.email,
      subject: 'Your Parking Reservation is Confirmed',
      html: getReservationConfirmationTemplate(
        reservation.userId.name,
        reservation.parkingId.name,
        'cid:qrcode', // Référence à l'image intégrée
        reservation.startTime,
        reservation.endTime,
        reservation.spotId
      ),
      attachments: [{
        filename: 'qrcode.png',
        content: base64QR,
        encoding: 'base64',
        cid: 'qrcode' // même identifiant que dans le template
      }]
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  } else if (newStatus === 'rejected') {
    // Envoyer un e-mail de refus pour la réservation principale
    const rejectionMailOptions = {
      from: process.env.EMAIL_USER,
      to: reservation.userId.email,
      subject: '❌ Your Reservation Could Not Be Confirmed',
      html: getReservationRejectionTemplate(
        reservation.userId.name,
        reservation.parkingId.name,
        reservation.startTime,
        reservation.endTime,
        reservation.spotId,
        getRandomRejectionReason()
      )
    };

    try {
      await transporter.sendMail(rejectionMailOptions);
      console.log(`Rejection email sent to ${reservation.userId.email}`);
    } catch (error) {
      console.error('Error sending rejection email:', error);
    }

  }

  // Mettre à jour le statut de la réservation actuelle
  reservation.status = newStatus;
  await reservation.save();

  await syncParkingSpotState(reservation, newStatus);

  // Mettre à jour la notification existante
  await Notification.findOneAndUpdate(
    { reservationId: reservationId },
    { 
      status: newStatus === 'accepted' ? 'acceptée' : 'refusée',
      isRead: false
    },
    { new: true }
  );

  return reservation;
}
const updateReservationStatusPayment = async (req, res) => {
  try {
    const { status,paymentStatus } = req.body;

    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status,paymentStatus },
      { new: true }
    );

    if (!updatedReservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.status(200).json(updatedReservation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const checkAvailability = async (req, res) => {
  try {
    const { parkingId, spotId } = req.params;
    const { startTime, endTime } = req.query;
    const isEmergency = req.query.isEmergency === 'true';
    const emergencyPurpose = req.query.emergencyPurpose;

    // Validation des paramètres
    if (!isValidObjectId(parkingId)) {

      return res.status(400).json({ success: false, message: 'Invalid parking ID' });
    }
    
    if (!spotId || !spotId.startsWith('parking-spot-')) {
      return res.status(400).json({ success: false, message: 'Invalid spot ID' });

    }

    if (!startTime || !endTime) {

      return res.status(400).json({ success: false, message: 'Start and end dates are required' });

    }

    // Conversion et validation des dates
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {

      return res.status(400).json({ success: false, message: 'Invalid dates' });

    }

    if (start >= end) {

      return res.status(400).json({ success: false, message: 'End date must be after start date' });

    }

    if (start < new Date()) {

      return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });

    }

    const parking = await Parking.findById(parkingId);
    if (!parking) {
      return res.status(404).json({ success: false, message: 'Parking not found' });
    }

    const spot = Array.isArray(parking.spots)
      ? parking.spots.find((s) => s.id === spotId)
      : null;
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Slot not found in parking layout' });
    }

    try {
      validateEmergencyPolicy({
        spot,
        reservationData: { isEmergency, emergencyPurpose }
      });
    } catch (policyError) {
      return res.status(200).json({
        success: true,
        isAvailable: false,
        message: policyError.message,
        overlappingReservations: []
      });
    }

    // Recherche des réservations existantes qui se chevauchent avec la période demandée
    const overlappingReservations = await findOverlappingReservations({
      parkingId,
      spotId,
      start,
      end
    });

    const isAvailable = overlappingReservations.length === 0;

    // Real-time physical check: if the booking starts near current time, confirm live occupancy.
    if (isAvailable) {
      try {
        await checkNearNowPhysicalAvailability({
          parking,
          parkingId,
          spotId,
          start,
          reservationData: { isEmergency }
        });
      } catch (availabilityError) {
        return res.status(200).json({
          success: true,
          isAvailable: false,
          message: availabilityError.message,
          overlappingReservations: []
        });
      }
    }

    return res.status(200).json({
      success: true,
      isAvailable,

      message: isAvailable 
        ? 'The spot is available for this period' 
        : 'The spot is not available for this period',
      overlappingReservations: isAvailable ? [] : overlappingReservations

    });
  } catch (error) {

    console.error('Error checking availability:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined

    });
  }
};

const getReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate("parkingId")
      .populate("userId");
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserByReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate(
      "userId"
    );

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.status(200).json({
      reservationId: reservation._id,
      user: reservation.userId, // this contains the populated user document
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate("parkingId")
      .populate("userId");
    if (!reservation) {

      return res.status(404).json({ message: 'Reservation not found' });

    }
    res.status(200).json(reservation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateReservation = async (req, res) => {
  try {
    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json(updatedReservation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteReservation = async (req, res) => {
  try {
    console.log("🔍 Attempting to delete reservation with ID:", req.params.id);

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {

      console.warn("⚠️ Reservation not found:", req.params.id);
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Restaurer la place de parking
    const parking = await Parking.findById(reservation.parkingId);
    if (parking) {
      console.log("🔄 Found parking for reservation:", parking._id);
      if (reservation.status === "accepted") {
        const spotIndex = Array.isArray(parking.spots)
          ? parking.spots.findIndex((spot) => spot.id === reservation.spotId)
          : -1;

        if (spotIndex !== -1) {
          parking.spots[spotIndex].status = 'available';
          parking.spots[spotIndex].reservedBy = null;
          parking.spots[spotIndex].reservationTime = null;
        }

        parking.availableSpots = Math.min(parking.totalSpots, parking.availableSpots + 1);
        await parking.save({ validateBeforeSave: false });
        console.log(
          "✅ Parking spots restored. Available spots:",
          parking.availableSpots
        );
      }
    } else {

      console.warn("⚠️ Parking not found for reservation:", reservation.parkingId);
    }

    await Reservation.findByIdAndDelete(reservation._id); // Use findByIdAndDelete instead of remove
    console.log("✅ Reservation successfully deleted:", reservation._id);
    res.status(200).json({ message: 'Reservation deleted' });

  } catch (error) {
    console.error("❌ Error deleting reservation:", error);
    res.status(500).json({ message: error.message });
  }
};

// Function to get owner's reservations
const getOwnerReservations = async (ownerId) => {
  try {
    // Trouver tous les parkings appartenant à ce propriétaire
    const ownerParkings = await Parking.find({ Owner: ownerId });

    if (!ownerParkings || ownerParkings.length === 0) {
      return [];
    }

    const parkingIds = ownerParkings.map((parking) => parking._id);

    // Trouver toutes les réservations pour ces parkings
    const reservations = await Reservation.find({
      parkingId: { $in: parkingIds },
    })
      .populate("parkingId")
      .populate("userId", "name email phone") // Inclure seulement les infos nécessaires de l'utilisateur
      .sort({ createdAt: -1 });

    return reservations;
  } catch (error) {

    console.error("❌ Error retrieving owner's reservations:", error);

    throw error;
  }
};


const getReservationsByUserId = async (userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    const reservations = await Reservation.find({ userId })
      .populate({
        path: "parkingId",
        select: "name location pricing totalSpots availableSpots",
      })
      .sort({ createdAt: -1 });

    return reservations;
  } catch (error) {
    console.error("❌ Error fetching user reservations:", error);
    throw error;
  }
}; // Added missing closing brace and semicolon
const getReservationsByMatricule = async (matricule) => {
  try {
    // Rechercher toutes les réservations avec cette matricule
    const reservations = await Reservation.find({ 
      matricule: matricule,
      status: { $in: ['active', 'pending'] }
    })
    .populate('parkingId', 'name location pricing') // Informations sur le parking
    .populate('userId', 'name email phone') // Informations sur l'utilisateur
    .sort({ createdAt: -1 });

    return {
      success: true,
      count: reservations.length,
      reservations: reservations,
      matricule: matricule
    };
  } catch (error) {
    console.error('❌ Error fetching reservations by matricule:', error);

    throw error;
  }
};

const releaseExpiredReservations = async ({ io } = {}) => {
  const now = new Date();
  const expirableStatuses = ['pending', 'accepted', 'confirmed', 'active', 'in-progress'];

  const expiredReservations = await Reservation.find({
    status: { $in: expirableStatuses },
    endTime: { $lte: now }
  });

  if (!expiredReservations.length) {
    return { processed: 0, releasedSpots: 0 };
  }

  const parkingCache = new Map();
  const dirtyParkingIds = new Set();
  const parkingReleaseCounts = new Map();
  let releasedSpots = 0;

  const getParkingCached = async (parkingId) => {
    const key = String(parkingId);
    if (parkingCache.has(key)) return parkingCache.get(key);
    const parking = await Parking.findById(parkingId);
    parkingCache.set(key, parking);
    return parking;
  };

  for (const reservation of expiredReservations) {
    const isPending = reservation.status === 'pending';
    const nextStatus = isPending ? 'canceled' : 'completed';
    const parking = await getParkingCached(reservation.parkingId);

    if (parking && Array.isArray(parking.spots)) {
      const spot = parking.spots.find((s) => s.id === reservation.spotId);
      if (spot && spot.status === 'reserved') {
        const reservedByMatches =
          !spot.reservedBy || String(spot.reservedBy) === String(reservation.userId);

        if (reservedByMatches) {
          spot.status = 'available';
          spot.reservedBy = null;
          spot.reservationTime = null;
          parking.availableSpots = parking.spots.filter((s) => s.status === 'available').length;
          dirtyParkingIds.add(String(parking._id));
          releasedSpots += 1;
          parkingReleaseCounts.set(
            String(parking._id),
            (parkingReleaseCounts.get(String(parking._id)) || 0) + 1
          );
        }
      }
    }

    reservation.status = nextStatus;
    await reservation.save();
  }

  for (const parkingId of dirtyParkingIds) {
    const parking = parkingCache.get(parkingId);
    if (!parking) continue;
    await parking.save({ validateBeforeSave: false });

    if (io) {
      emitParkingUpdate(io, parking, {
        reason: 'reservation_expired_cleanup',
        releasedSpots: parkingReleaseCounts.get(parkingId) || 0,
      });
    }
  }

  return { processed: expiredReservations.length, releasedSpots };
};

const startReservationExpiryScheduler = ({ io, intervalMs = EXPIRY_CLEANUP_INTERVAL_MS } = {}) => {
  if (expiryCleanupTimer) return;

  const runCleanup = async () => {
    try {
      const result = await releaseExpiredReservations({ io });
      if (result.processed > 0) {
        console.log(
          `🧹 Expiry cleanup: processed ${result.processed} reservation(s), released ${result.releasedSpots} spot(s)`
        );
      }
    } catch (error) {
      console.error('❌ Reservation expiry cleanup failed:', error.message);
    }
  };

  // Run once at startup so stale reservations are cleared quickly.
  runCleanup();
  expiryCleanupTimer = setInterval(runCleanup, intervalMs);
  console.log(`🕒 Reservation expiry cleanup scheduler started (${intervalMs}ms)`);
};

module.exports = {
  checkAvailability,
  createReservation,
  updateReservationStatus,
  calculatePrice,
  getReservations,
  getReservationById,
  updateReservation,
  deleteReservation,
  checkRealSpotStatus,
  getUserByReservation,
  getOwnerReservations,
  getReservationsByUserId,
  updateReservationStatusPayment,
  getReservationsByMatricule,
  releaseExpiredReservations,
  startReservationExpiryScheduler
};