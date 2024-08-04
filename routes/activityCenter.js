const express = require("express");
const router = express.Router();
const User = require("../models/user");
const TripFolder = require("../models/tripFolder");

const {
  verifyToken,
  retrieveUser,
} = require("../public/javascripts/userOperations");

const {
  CustomErr,
  setWildcardError,
  queryAppendError,
} = require("../public/javascripts/customErrors");

router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    const incomingRequests = await Promise.all(
      user.incomingRequests.map(async (request) => {
        try {
          const sentByUser = await User.findById(request.user);
          const requestedFolder = await TripFolder.findById(request.tripFolder);
          return { user: sentByUser, tripFolder: requestedFolder };
        } catch {
          return null;
        }
      })
    );

    const outgoingRequests = await Promise.all(
      user.outgoingRequests.map(async (request) => {
        try {
          const requestedUser = await User.findById(request.user);
          const requestedFolder = await TripFolder.findById(request.tripFolder);
          return { user: requestedUser, tripFolder: requestedFolder };
        } catch {
          return null;
        }
      })
    );

    res.render("activityCenter/index", {
      user: user,
      incomingRequests: incomingRequests,
      outgoingRequests: outgoingRequests,
    });
  } catch (err) {
    console.error(err);
  }
});

module.exports = router;
