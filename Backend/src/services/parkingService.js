const mongoose = require("mongoose");
const ParkingRequest = require("../models/parkingRequestModel");
const Parking = require("../models/parkingModel");
const fs = require("fs");
const path = require("path");

const getParkingsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Validate employeeId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "ID d'employé invalide." });
    }

    // Find parkings with matching employee ID and correctly populate Owner field
    const parkings = await Parking.find({
      id_employee: employeeId,
    }).populate("Owner", "name email");

    if (!parkings || parkings.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun parking trouvé pour cet employé." });
    }

    return res.status(200).json(parkings);
  } catch (error) {
    console.error("Erreur lors de la récupération des parkings:", error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
};

const getNearbyRecommendedParkings = async (lat, lng, limit = 10) => {
  try {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
      const earthRadiusKm = 6371;
      const deltaLat = toRadians(lat2 - lat1);
      const deltaLng = toRadians(lng2 - lng1);
      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const parkings = await Parking.find({
      status: "accepted",
      availableSpots: { $gt: 0 },
      "position.lat": { $type: "number" },
      "position.lng": { $type: "number" },
    })
      .populate("Owner", "name email")
      .lean();

    return parkings
      .map((parking) => ({
        ...parking,
        distance: haversineDistanceKm(
          parseFloat(lat),
          parseFloat(lng),
          parking.position.lat,
          parking.position.lng
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching nearby parkings:", error);
    throw error;
  }
};

// Function to validate and update parking
const updateParkingDirectly = async (parkingId, updates, userId) => {
  // Find the parking and check ownership
  const parking = await Parking.findById(parkingId);
  if (!parking) {
    throw new Error("Parking not found");
  }

  // Check if user is owner
  if (parking.Owner.toString() !== userId) {
    throw new Error("Not authorized to update this parking");
  }

  // Validate the updates
  if (updates.totalSpots && updates.totalSpots < (parking.reservedSpots || 0)) {
    throw new Error("Total spots cannot be less than currently reserved spots");
  }

  // Calculate available spots if total spots are being updated
  const availableSpots = updates.totalSpots
    ? updates.totalSpots - (parking.reservedSpots || 0)
    : updates.availableSpots || parking.availableSpots;

  // Prepare the update object
  const updateObj = {
    ...updates,
    availableSpots,
    // Ensure the owner cannot be changed
    Owner: parking.Owner
  };

  // Update the parking
  return await Parking.findByIdAndUpdate(
    parkingId,
    updateObj,
    { 
      new: true, 
      runValidators: true,
      // Return the full updated document
      returnDocument: 'after'
    }
  ).populate('Owner');
};

const updateTotalSpots = async (req, res) => {
  try {
    const { id } = req.params;
    const { change } = req.body; // change can be positive or negative

    if (isNaN(change)) {
      return res.status(400).json({ message: "Invalid change value." });
    }

    // Find the parking request
    const parking = await Parking.findById(id);
    if (!parking) {
      return res.status(404).json({ message: "Parking request not found" });
    }

    // Calculate new available spots
    const newAvailableSpots = parking.availableSpots + parseInt(change);

    // Ensure availableSpots stays within valid range
    if (newAvailableSpots < 0) {
      return res
        .status(400)
        .json({ message: "Available spots cannot be less than 0." });
    }

    if (newAvailableSpots > parking.totalSpots) {
      return res
        .status(400)
        .json({ message: "Available spots cannot exceed total spots." });
    }

    // Update available spots
    parking.availableSpots = newAvailableSpots;
    await parking.save();

    return res
      .status(200)
      .json({ message: "Available spots updated successfully", parking });
  } catch (error) {
    console.error("Error updating available spots:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Refactored to reduce cognitive complexity
const createParking = async (req, res) => {
  try {
    // Log the user role
    console.log("Utilisateur connecté:", req.user);
    if (!isAuthorizedRole(req.user)) {
      return res
        .status(403)
        .json({ message: "Accès refusé, rôle non autorisé" });
    }

    const {
      name,
      description,
      position,
      totalSpots,
      availableSpots,
      pricing,
      vehicleTypes,
      features,
    } = req.body;

    // Validate required fields
    if (!areRequiredFieldsPresent(name, position, totalSpots, availableSpots, pricing, vehicleTypes)) {
      return res
        .status(400)
        .json({ message: "Tous les champs obligatoires sont requis" });
    }

    // Validate field types
    if (!areFieldTypesValid(totalSpots, availableSpots, pricing, vehicleTypes, features)) {
      return res
        .status(400)
        .json({ message: "Types de champs invalides" });
    }

    // Create parking request
    const parkingRequest = new ParkingRequest({
      action: "create",
      status: "pending",
      Owner: req.user._id,
      name,
      description,
      position,
      totalSpots,
      availableSpots,
      pricing,
      vehicleTypes,
      features: features || [],
      images: req.files ? req.files.map((file) => file.path) : [],
    });

    await parkingRequest.save();

    // If admin, create parking directly
    if (req.user.role === "Admin") {
      return await createParkingAsAdmin(res, req.user._id, name, description, position, 
        totalSpots, availableSpots, pricing, vehicleTypes, features, req.files);
    }

    // Response for owner
    return res.status(201).json({
      message: "Demande de parking soumise avec succès",
      parkingRequest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur serveur lors de la création du parking",
      error: error.message,
    });
  }
};

// Helper functions to reduce cognitive complexity
function isAuthorizedRole(user) {
  return user && ["Admin", "Owner", "Space_Owner"].includes(user.role);
}

function areRequiredFieldsPresent(name, position, totalSpots, availableSpots, pricing, vehicleTypes) {
  return name && position && totalSpots !== undefined && 
         availableSpots !== undefined && pricing && vehicleTypes;
}

function areFieldTypesValid(totalSpots, availableSpots, pricing, vehicleTypes, features) {
  // Check numeric fields
  if (typeof totalSpots !== "number" || typeof availableSpots !== "number") {
    return false;
  }

  // Check pricing object
  if (typeof pricing !== "object" || typeof pricing.hourly !== "number") {
    return false;
  }

  // Check vehicleTypes array
  if (!Array.isArray(vehicleTypes) || vehicleTypes.length === 0) {
    return false;
  }

  // Check features if present
  if (features && !Array.isArray(features)) {
    return false;
  }

  return true;
}

async function createParkingAsAdmin(res, ownerId, name, description, position, 
  totalSpots, availableSpots, pricing, vehicleTypes, features, files) {
  const parking = new Parking({
    name,
    description,
    position,
    totalSpots,
    availableSpots,
    pricing,
    vehicleTypes,
    features: features || [],
    images: files ? files.map((file) => file.path) : [],
    Owner: ownerId,
  });

  await parking.save();
  return res.status(201).json(parking);
}

// Récupérer tous les parkings
const getParkings = async (req, res) => {
  try {
    const parkings = await Parking.find();
    res.status(200).json(parkings);
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur lors de la récupération des parkings",
      error: error.message,
    });
  }
};

// Récupérer un parking par ID
const getParkingById = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }
    res.status(200).json(parking);
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur lors de la récupération du parking",
      error: error.message,
    });
  }
};

const updateParking = async (req, res) => {
  try {
    const parkingId = req.params.id;
    console.log("📌 Requête reçue pour mise à jour du parking:", parkingId);

    const updates = req.body;

    // Handle direct updates for owners
    try {
      if (req.user.role === 'Owner' || req.user.role === 'Space_Owner') {
        console.log("Processing owner update for parking:", parkingId);
        const updatedParking = await updateParkingDirectly(parkingId, updates, req.user._id);
        console.log("Successfully updated parking:", updatedParking);
        return res.status(200).json({
          success: true,
          message: "Parking updated successfully",
          data: updatedParking
        });
      }
    } catch (error) {
      console.error("Error updating parking:", error);
      const status = error.message.includes("not found") ? 404 : 
                    error.message.includes("Not authorized") ? 403 : 400;
      return res.status(status).json({ 
        success: false,
        message: error.message 
      });
    }

    // For non-owners, use the request system
    const validationResult = await validateParkingAndPermissions(req, parkingId);
    if (validationResult.error) {
      return res.status(validationResult.status).json({ message: validationResult.message });
    }

    const parking = validationResult.parking;
    const { name, description, position, totalSpots, availableSpots, pricing, vehicleTypes, features } = updates;

    // Validate required fields
    if (!areRequiredFieldsPresent(name, position, totalSpots, availableSpots, pricing, vehicleTypes)) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    // Handle images
    const images = handleImages(parking, req.files);

    // Create update request for non-owners
    const parkingRequest = await createUpdateRequest(
      parkingId, name, description, position, totalSpots, availableSpots, 
      pricing, vehicleTypes, features, images, req.user._id
    );

    // Handle admin updates
    if (req.user.role === "Admin") {
      return await handleAdminUpdate(res, parkingRequest, parkingId, name, description, position,
        totalSpots, availableSpots, pricing, vehicleTypes, features, images);
    }

    // Response for other users
    return res.status(200).json({
      message: "Demande de mise à jour soumise avec succès",
      parkingRequest
    });

  } catch (error) {
    console.error("❌ Erreur serveur:", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la mise à jour du parking",
      error: error.message
    });
  }
};

// Helper functions for updateParking
async function validateParkingAndPermissions(req, parkingId) {
  const parking = await Parking.findById(parkingId);
  if (!parking) {
    return { error: true, status: 404, message: "Parking non trouvé" };
  }

  if (req.user.role !== "Admin" && parking.Owner.toString() !== req.user.id) {
    return { error: true, status: 403, message: "Accès refusé" };
  }

  return { error: false, parking };
}

function handleImages(parking, files) {
  let images = parking.images || [];
  if (files && files.length > 0) {
    images = files.map((file) => file.path);
  }
  return images;
}

async function createUpdateRequest(parkingId, name, description, position, totalSpots, availableSpots,
  pricing, vehicleTypes, features, images, ownerId) {
  
  const parkingRequest = new ParkingRequest({
    action: "update",
    status: "pending",
    parkingId,
    name,
    description,
    position,
    totalSpots,
    availableSpots,
    pricing,
    vehicleTypes,
    features: features || [],
    images,
    Owner: ownerId
  });

  await parkingRequest.save();
  return parkingRequest;
}

async function handleAdminUpdate(res, parkingRequest, parkingId, name, description, position,
  totalSpots, availableSpots, pricing, vehicleTypes, features, images) {
  
  if (parkingRequest.status === "accepted") {
    const updatedParking = await Parking.findByIdAndUpdate(
      parkingId,
      {
        name,
        description,
        position,
        totalSpots,
        availableSpots,
        pricing,
        vehicleTypes,
        features: features || [],
        images
      },
      { new: true, runValidators: true }
    );

    if (!updatedParking) {
      return res.status(404).json({ message: "Parking introuvable après mise à jour" });
    }

    return res.status(200).json({ message: "Parking mis à jour avec succès", updatedParking });
  }

  return res.status(200).json({
    message: "Demande de mise à jour en attente d'approbation",
    parkingRequest
  });
}

const deleteParking = async (req, res) => {
  try {
    const { id } = req.params;

    const parking = await Parking.findById(id);
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }

    await Parking.findByIdAndDelete(id);

    res.status(200).json({ message: "Parking supprimé avec succès" });
  } catch (error) {
    console.error("❌ Erreur lors de la suppression :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

const approveParkingRequest = async (req, res) => {
  try {
    const requestId = req.params.id;

    // Vérifier si la demande existe
    const parkingRequest = await ParkingRequest.findById(requestId);
    if (!parkingRequest) {
      return res
        .status(404)
        .json({ message: "Demande de modification non trouvée" });
    }

    // Vérifier si l'utilisateur est un admin
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Accès refusé, autorisation insuffisante" });
    }

    if (parkingRequest.action === "update") {
      // Mettre à jour le parking avec les nouvelles informations
      const updatedParking = await Parking.findByIdAndUpdate(
        parkingRequest.parkingId,
        {
          name: parkingRequest.name,
          description: parkingRequest.description,
          position: parkingRequest.position,
          totalSpots: parkingRequest.totalSpots,
          availableSpots: parkingRequest.availableSpots,
          pricing: parkingRequest.pricing,
          vehicleTypes: parkingRequest.vehicleTypes,
          features: parkingRequest.features,
          images: parkingRequest.images,
        },
        { new: true, runValidators: true }
      );

      if (!updatedParking) {
        return res.status(404).json({ message: "Parking non trouvé" });
      }
    } else if (parkingRequest.action === "delete") {
      // Supprimer le parking
      await Parking.findByIdAndDelete(parkingRequest.parkingId);
    }

    // Supprimer la requête une fois traitée
    await ParkingRequest.findByIdAndDelete(requestId);

    return res
      .status(200)
      .json({ message: "Demande traitée avec succès et supprimée" });
  } catch (error) {
    console.error("Erreur lors de l'approbation :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

const saveParking3D = async (req, res) => {
  try {
    const { id } = req.params;
    const { spots, layout, totalSpots, availableSpots } = req.body;

    // Recherche du parking existant
    const parking = await Parking.findById(id);
    
    if (!parking) {
      return res.status(404).json({ 
        success: false, 
        message: "Parking non trouvé" 
      });
    }

    // Mise à jour seulement des champs fournis
    const updateData = {};
    
    if (spots) updateData.spots = spots;
    if (layout) updateData.layout = layout;
    if (totalSpots !== undefined) updateData.totalSpots = totalSpots;
    if (availableSpots !== undefined) updateData.availableSpots = availableSpots;

    // Mise à jour partielle qui ignore les validateurs pour les champs non mis à jour
    const updatedParking = await Parking.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: "Plan de parking mis à jour avec succès",
      data: updatedParking
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du parking:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du parking",
      error: error.message
    });
  }
};

const reserveParkingSpot = async (req, res) => {
  const { parkingId, spotId } = req.params;
  const userId = req.user._id; // Suppose que l'utilisateur est authentifié
  
  try {
    // Trouver le parking avec la place spécifique
    const parking = await Parking.findById(parkingId);
    
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }
    
    // Trouver l'index de la place dans le tableau des places
    const spotIndex = parking.spots.findIndex(spot => spot.id === spotId);
    
    if (spotIndex === -1) {
      return res.status(404).json({ message: "Place de parking non trouvée" });
    }
    
    // Vérifier si la place est déjà occupée ou réservée
    if (parking.spots[spotIndex].status !== 'available') {
      return res.status(400).json({ 
        message: "Cette place n'est pas disponible", 
        status: parking.spots[spotIndex].status 
      });
    }
    
    // Mettre à jour le statut de la place
    parking.spots[spotIndex].status = 'reserved';
    parking.spots[spotIndex].reservedBy = userId;
    parking.spots[spotIndex].reservationTime = new Date();
    
    // Mettre à jour le nombre de places disponibles
    parking.availableSpots = parking.availableSpots - 1;
    
    // Sauvegarder les modifications
    await parking.save();
    
    return res.status(200).json({
      message: "Place réservée avec succès",
      spot: parking.spots[spotIndex]
    });
    
  } catch (error) {
    console.error("Erreur lors de la réservation de la place:", error);
    return res.status(500).json({ 
      message: "Erreur serveur lors de la réservation", 
      error: error.message 
    });
  }
};

const updateParkingSpot = async (req, res) => {
  const { parkingId, spotId } = req.params;
  const { status } = req.body;
  const userId = req.user?._id;
  
  try {
    // Trouver le parking avec la place spécifique
    const parking = await Parking.findById(parkingId);
    
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }
    
    // Trouver l'index de la place dans le tableau des places
    const spotIndex = parking.spots.findIndex(spot => spot.id === spotId);
    
    if (spotIndex === -1) {
      return res.status(404).json({ message: "Place de parking non trouvée" });
    }
    
    // Vérifier si la place est déjà occupée ou réservée
    if (status === 'reserved' && parking.spots[spotIndex].status !== 'available') {
      return res.status(400).json({ 
        message: "Cette place n'est pas disponible", 
        status: parking.spots[spotIndex].status 
      });
    }
    
    // Mettre à jour le statut de la place
    parking.spots[spotIndex].status = status;
    if (status === 'reserved') {
      parking.spots[spotIndex].reservedBy = userId;
      parking.spots[spotIndex].reservationTime = new Date(); 
      
      // Mettre à jour le nombre de places disponibles
      parking.availableSpots = Math.max(0, parking.availableSpots - 1);
    } else if (status === 'available' && parking.spots[spotIndex].status !== 'available') {
      // Si on libère une place, incrémenter le compteur
      parking.availableSpots += 1;
    }
    
    // Sauvegarder les modifications avec l'option validateBeforeSave désactivée
    await parking.save({ validateBeforeSave: false });
    
    return res.status(200).json({
      message: `Statut de la place mis à jour: ${status}`,
      spot: parking.spots[spotIndex]
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la place:", error);
    return res.status(500).json({ 
      message: "Erreur serveur lors de la mise à jour", 
      error: error.message 
    });
  }
};

module.exports = {
  createParking,
  getParkings,
  getParkingById,
  updateParking,
  deleteParking,
  approveParkingRequest,
  getParkingsByEmployee,
  updateTotalSpots,
  saveParking3D,
  reserveParkingSpot,
  updateParkingSpot,
  getNearbyRecommendedParkings
};
