const mongoose = require("mongoose");

const tripFileSchema = mongoose.Schema({
  uploadDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  userSetDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  uploadedByName: {
    type: String,
    required: true,
  },
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  imageURL: {
    type: String,
    required: true,
  },
  imageHash: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("TripFile", tripFileSchema);
