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
});

module.exports = mongoose.model("User", userSchema);
