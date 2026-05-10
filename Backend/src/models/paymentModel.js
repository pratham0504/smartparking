const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["card", "cash", "fastag", "wallet"],
    },
    paymentDetails: {
      cardNumber: String,
      cardHolder: String,
      expirationDate: String,
      cvv: String,
      fastagId: String,
      operator: String
    },
    transactionId: String,
    paidAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
