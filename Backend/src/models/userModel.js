const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: false 
    },
    lastName: { 
      type: String, 
      required: false 
    },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    phone: { type: String, required: true, unique: true },
    countryCode: { type: String, default: '+91' },
    status: {
      type: String,
      enum: ["Active", "Blocked", "Pending_Verification"],
      required: false,
      default: "Pending_Verification",
    },
    role: { 
      type: String, 
      enum: ["Vehicle_Owner", "Space_Owner", "Business", "Admin"],
      required: true
    },
    vehicleType: {
      type: String,
      enum: [
        "2Wheeler",
        "Hatchback",
        "Sedan",
        "SUV",
        "Commercial"
      ],
      required: function() { return this.role === "Vehicle_Owner"; }
    },
    preferredLanguage: { type: String, default: 'en-IN' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    image: {
      type: String,
      default:
        "https://res.cloudinary.com/dpcyppzpw/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1740761212/profile-user-icon_h3njnr.jpg",
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Favorite" }],
    fastags: [
      {
        tagId: { type: String, index: true },
        vehiclePlate: { type: String },
        active: { type: Boolean, default: true },
        linkedAt: { type: Date, default: Date.now }
      }
    ],
    rfidCard: {
      type: String,
      index: true,
      default: null
    },
    vehicleRFID: {
      type: String,
      index: true,
      default: null
    },
    rfidCards: [
      {
        cardId: { type: String, required: true, unique: true },
        cardName: { type: String, default: 'My RFID Card' },
        active: { type: Boolean, default: true },
        registeredAt: { type: Date, default: Date.now },
        lastUsed: { type: Date, default: null }
      }
    ],
    walletBalance: {
      type: Number,
      default: 500
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
