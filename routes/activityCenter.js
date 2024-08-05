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

// Display Activity Center Page
router.get("/", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
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

    const formattedNotifications = await Promise.all(
      user.notifications.map(async (notif) => {
        try {
          const notifUser = await User.findById(notif.user);
          const notifTripFolder = await TripFolder.findById(notif.tripFolder);
          const notifType = notif.notifType;

          switch (notifType) {
            case "incomingRequest":
              return `${notifUser.username} has invited you to join a folder named: ${notifTripFolder.folderName}`;
            case "removeUser":
              return `${notifUser.username} left shared folder: ${notifTripFolder.folderName}`;
            case "acceptIncomingRequest":
              return `${notifUser.username} has joined ${notifTripFolder.folderName}`;
            case "declineIncomingRequest":
              return `${notifUser.username} declined to join ${notifTripFolder.folderName}`;
            default:
              throw new CustomErr("Error: invalid notification type detected");
          }
        } catch {
          return null;
        }
      })
    );

    res.render("activityCenter/index", {
      user: user,
      incomingRequests: incomingRequests,
      outgoingRequests: outgoingRequests,
      formattedNotifications: formattedNotifications,
      errorMessage: errorMessage,
    });
  } catch (err) {
    err = setWildcardError(err, "Error displaying activity center");
    res.redirect(queryAppendError("/", err));
  }
});

// Delete Notification
router.put("/deleteNotification", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    const index = parseInt(req.query.index);
    if (index > -1) {
      user.notifications.splice(index, 1);
      await user.save();
    } else throw new CustomErr("Invalid notification index");
    res.redirect("/activityCenter");
  } catch (err) {
    err = setWildcardError(err, "Error deleting notification");
    res.redirect(queryAppendError("/activityCenter", err));
  }
});

// Accept Incoming Request
router.put(
  "/:tripID/:userID/acceptIncomingRequest",
  verifyToken,
  async (req, res) => {
    try {
      const user = await retrieveUser(req, res);
      const tripFolder = await TripFolder.findById(req.params.tripID);
      const sentByUser = await User.findById(req.params.userID);

      // Handle adding user to trip folder
      tripFolder.users.push(user.id);
      tripFolder.isShared = true;
      const indexOfFolder = sentByUser.privateFolders.indexOf(tripFolder.id);
      if (indexOfFolder > -1)
        sentByUser.privateFolders.splice(indexOfFolder, 1); // remove folder from private folders
      sentByUser.sharedFolders.push(tripFolder.id);
      user.sharedFolders.push(tripFolder.id);

      // Handle removing unneeded requests and notifications
      removeRequestsAndNotifications(user, sentByUser, tripFolder);

      // Send notification to sent by user
      const responseNotification = {
        user: user.id,
        tripFolder: tripFolder.id,
        notifType: "acceptIncomingRequest",
      };
      sentByUser.notifications.push(responseNotification);

      await user.save();
      await tripFolder.save();
      await sentByUser.save();
      res.redirect("/activityCenter");
    } catch (err) {
      err = setWildcardError(err, "Error accepting incoming request");
      res.redirect(queryAppendError("/activityCenter", err));
    }
  }
);

// Decline Incoming Request
router.put(
  "/:tripID/:userID/declineIncomingRequest",
  verifyToken,
  async (req, res) => {
    try {
      const user = await retrieveUser(req, res);
      const tripFolder = await TripFolder.findById(req.params.tripID);
      const sentByUser = await User.findById(req.params.userID);

      // Remove requests and send notification to sent by user
      removeRequestsAndNotifications(user, sentByUser, tripFolder);
      const responseNotification = {
        user: user.id,
        tripFolder: tripFolder.id,
        notifType: "declineIncomingRequest",
      };
      sentByUser.notifications.push(responseNotification);

      await user.save();
      await tripFolder.save();
      await sentByUser.save();
      res.redirect("/activityCenter");
    } catch (err) {
      err = setWildcardError(err, "Error rejecting incoming request");
      res.redirect(queryAppendError("/activityCenter", err));
    }
  }
);

// Cancel Outgoing Request
router.put(
  "/:tripID/:userID/cancelOutgoingRequest",
  verifyToken,
  async (req, res) => {
    try {
      const user = await retrieveUser(req, res);
      const tripFolder = await TripFolder.findById(req.params.tripID);
      const requestedUser = await User.findById(req.params.userID);

      // Remove requests and notifications
      removeRequestsAndNotifications(requestedUser, user, tripFolder);

      await user.save();
      await tripFolder.save();
      await requestedUser.save();
      res.redirect("/activityCenter");
    } catch (err) {
      err = setWildcardError(err, "Error cancelling outgoing request");
      res.redirect(queryAppendError("/activityCenter", err));
    }
  }
);

async function removeRequestsAndNotifications(user, sentByUser, tripFolder) {
  const inRequestIndex = user.incomingRequests.findIndex(
    (incomingRequest) =>
      incomingRequest.user.equals(sentByUser.id) &&
      incomingRequest.tripFolder.equals(tripFolder.id)
  );

  if (inRequestIndex > -1) user.incomingRequests.splice(inRequestIndex, 1);
  else throw new CustomErr("Incoming request not found");

  const outRequestIndex = sentByUser.outgoingRequests.findIndex(
    (outgoingRequest) =>
      outgoingRequest.user.equals(user.id) &&
      outgoingRequest.tripFolder.equals(tripFolder.id)
  );

  if (outRequestIndex > -1)
    sentByUser.outgoingRequests.splice(outRequestIndex, 1);
  else throw new CustomErr("Outgoing request not found");

  const notificationIndex = user.notifications.findIndex(
    (notification) =>
      notification.user.equals(sentByUser.id) &&
      notification.tripFolder.equals(tripFolder.id) &&
      notification.notifType === "incomingRequest"
  );

  if (notificationIndex > -1) user.notifications.splice(notificationIndex, 1);
}

module.exports = router;
