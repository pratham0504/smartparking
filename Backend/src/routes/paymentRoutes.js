const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const paymentController = require("../controllers/paymentController");

// Payment routes for Indian and international payments
router.post("/stripe/create-payment-intent", verifyToken, paymentController.createStripePaymentIntent);
router.post("/razorpay/create-order", verifyToken, paymentController.createRazorpayOrder);
router.post("/razorpay/verify", verifyToken, paymentController.verifyRazorpayPayment);
router.post("/upi/create-payment", verifyToken, paymentController.createUPIPayment);
router.post("/wallet/pay", verifyToken, paymentController.payWithWallet);
router.post("/confirm-payment", verifyToken, paymentController.confirmStripePayment);
router.get("/status/:paymentId", verifyToken, paymentController.getPaymentStatus);

module.exports = router;
