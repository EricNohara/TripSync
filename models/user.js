const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  isPrivate: {
    type: Boolean,
    required: true,
    default: false,
  },
  privateFolders: {
    type: Array,
    required: true,
    default: [],
  },
  sharedFolders: {
    type: Array,
    required: true,
    default: [],
  },
  recentFolders: {
    type: Array,
    required: true,
    default: [],
  },
  incomingRequests: {
    type: [
      {
        user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
        tripFolder: {
          type: mongoose.Schema.ObjectId,
          ref: "TripFolder",
          required: true,
        },
      },
    ],
    required: true,
    default: [],
  },
  outgoingRequests: {
    // used to avoid spam requests
    type: [
      {
        user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
        tripFolder: {
          type: mongoose.Schema.ObjectId,
          ref: "TripFolder",
          required: true,
        },
      },
    ],
    required: true,
    default: [],
  },
  notifications: {
    // used to display important info: (new request, accepted request, rejected request)
    type: [
      {
        user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
        tripFolder: {
          type: mongoose.Schema.ObjectId,
          ref: "TripFolder",
          required: true,
        },
        notifType: {
          type: String,
          required: true,
        },
        fallbackUsername: { type: String, required: false },
        fallbackFolderName: { type: String, require: false },
      },
    ],
    required: true,
    default: [],
  },
  newNotificationCount: {
    type: Number,
    required: true,
    default: 0,
  },
  passwordResetToken: {
    type: String,
    required: false,
  },
  passwordResetTokenExpires: {
    type: Date,
    required: false,
  },
});

module.exports = mongoose.model("User", userSchema);
