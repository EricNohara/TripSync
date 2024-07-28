const mongoose = require("mongoose");

const tripFolderSchema = new mongoose.Schema({
  folderName: {
    type: String,
    required: true,
  },
  isShared: {
    type: Boolean,
    required: true,
    default: false,
  },
  users: {
    type: Array,
    required: true,
    default: [],
  },
  createdAtDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  tripDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  tripFiles: {
    type: Array,
    required: true,
    default: [],
  },
});

module.exports = mongoose.model("TripFolder", tripFolderSchema);
