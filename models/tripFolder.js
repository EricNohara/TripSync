const mongoose = require("mongoose");

const tripFolderSchema = new mongoose.Schema({
  folderType: {
    type: String,
    required: true,
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
