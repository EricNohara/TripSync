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

tripFileSchema.virtual("imagePath").get(function () {
  if (this.image != null && this.imageType != null) {
    return `data:${this.imageType};charset=utf-8;base64,${this.image.toString(
      "base64"
    )}`;
  }
});

module.exports = mongoose.model("TripFile", tripFileSchema);
