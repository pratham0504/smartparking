const express = require("express");
const router = express.Router();
const { upload, getUserFromToken } = require("../middlewares/uploadMiddleware");
const { verifyToken } = require("../middlewares/authMiddleware");
const User = require("../models/userModel");
const mongoose = require('mongoose');

const {
  checkEmailValidation,
  signup,
  loginAfterSignUp,
  verifyOTP,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  loginVerifyOTP,
  userProfile,
  changeUserStatus,
  updateProfile,
  createUser, // Import the createUser function
  addFavorite,
  removeFavorite,
  completeProfile
} = require("../services/userService");

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/loginAfterSignUp", loginAfterSignUp);
router.post("/login-verify-otp", loginVerifyOTP);
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.post("/users", createUser); // Add this route to create a user
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/users/login", loginUser);
router.post("/check-email", checkEmailValidation);
router.post("/login", loginUser);
router.get("/userProfile", userProfile);
router.post("/complete-profile", verifyToken, completeProfile);
router.put("/changeStatus/:id", changeUserStatus);
router.put("/profile", getUserFromToken, upload, updateProfile);

router.post("/favorites/add/:parkingId", verifyToken, addFavorite);
router.delete("/favorites/remove/:parkingId", verifyToken, removeFavorite);

// RFID Card Management
router.get("/rfid-cards", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Invalid user id or unauthorized" });
    }
    const user = await User.findById(userId).select("rfidCards");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ rfidCards: user.rfidCards || [] });
  } catch (error) {
    console.error("Error fetching RFID cards:", error);
    res.status(500).json({ message: "Error fetching RFID cards", error: error.message });
  }
});

router.post("/rfid-cards", verifyToken, async (req, res) => {
  try {
    const { cardId, cardName } = req.body;
    
    if (!cardId || cardId.trim() === "") {
      return res.status(400).json({ message: "Card ID is required" });
    }

    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Invalid user id or unauthorized" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if card already registered to this user
    const existing = user.rfidCards?.find(c => c.cardId === cardId);
    if (existing) {
      return res.status(400).json({ message: "This RFID card is already registered" });
    }

    // Check if card is registered to another user
    const otherUser = await User.findOne({ "rfidCards.cardId": cardId });
    if (otherUser) {
      return res.status(400).json({ message: "This RFID card is already registered to another user" });
    }

    // Add new card
    if (!user.rfidCards) {
      user.rfidCards = [];
    }

    user.rfidCards.push({
      cardId: cardId.trim(),
      cardName: cardName || "My RFID Card",
      active: true,
      registeredAt: new Date(),
      lastUsed: null
    });

    // Set as default if first card
    if (user.rfidCards.length === 1) {
      user.rfidCard = cardId.trim();
    }

    await user.save();

    res.status(201).json({
      message: "RFID card registered successfully",
      rfidCards: user.rfidCards
    });
  } catch (error) {
    console.error("Error registering RFID card:", error);
    res.status(500).json({ message: "Error registering RFID card", error: error.message });
  }
});

router.put("/rfid-cards/:cardId/toggle", verifyToken, async (req, res) => {
  try {
    const { cardId } = req.params;

    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Invalid user id or unauthorized" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const card = user.rfidCards?.find(c => c.cardId === cardId);
    if (!card) {
      return res.status(404).json({ message: "RFID card not found" });
    }

    card.active = !card.active;

    // Update default card if disabling the default one
    if (!card.active && user.rfidCard === cardId) {
      const activeCard = user.rfidCards.find(c => c.active);
      user.rfidCard = activeCard ? activeCard.cardId : null;
    }

    await user.save();

    res.status(200).json({
      message: `RFID card ${card.active ? 'activated' : 'deactivated'} successfully`,
      rfidCards: user.rfidCards
    });
  } catch (error) {
    console.error("Error toggling RFID card:", error);
    res.status(500).json({ message: "Error toggling RFID card", error: error.message });
  }
});

router.delete("/rfid-cards/:cardId", verifyToken, async (req, res) => {
  try {
    const { cardId } = req.params;

    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Invalid user id or unauthorized" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cardIndex = user.rfidCards?.findIndex(c => c.cardId === cardId);
    if (cardIndex === -1 || cardIndex === undefined) {
      return res.status(404).json({ message: "RFID card not found" });
    }

    user.rfidCards.splice(cardIndex, 1);

    // Update default card if deleting the default one
    if (user.rfidCard === cardId) {
      user.rfidCard = user.rfidCards?.length > 0 ? user.rfidCards[0].cardId : null;
    }

    await user.save();

    res.status(200).json({
      message: "RFID card deleted successfully",
      rfidCards: user.rfidCards
    });
  } catch (error) {
    console.error("Error deleting RFID card:", error);
    res.status(500).json({ message: "Error deleting RFID card", error: error.message });
  }
});

router.put("/rfid-cards/:cardId/set-default", verifyToken, async (req, res) => {
  try {
    const { cardId } = req.params;

    const userId = req.user?.id || req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Invalid user id or unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const card = user.rfidCards?.find(c => c.cardId === cardId);
    if (!card) {
      return res.status(404).json({ message: "RFID card not found" });
    }

    if (!card.active) {
      return res.status(400).json({ message: "Cannot set inactive card as default" });
    }

    user.rfidCard = cardId;
    await user.save();

    res.status(200).json({
      message: "Default RFID card updated successfully",
      rfidCards: user.rfidCards
    });
  } catch (error) {
    console.error("Error setting default RFID card:", error);
    res.status(500).json({ message: "Error setting default RFID card", error: error.message });
  }
});

router.get("/employees", verifyToken, async (req, res) => {
  try {
    // 🔍 Vérifier si des employés existent en base de données
    const employees = await User.find({ role: "Employe" }).select("name phone role");

    // Return empty array instead of 404 when no employees found
    res.status(200).json(employees);
  } catch (error) {
    console.error("Erreur lors de la récupération des employés :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});


module.exports = router;
