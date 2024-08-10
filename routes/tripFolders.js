const express = require("express");
const sharp = require("sharp");
const router = express.Router();
const TripFolder = require("../models/tripFolder");
const TripFile = require("../models/tripFile");
const User = require("../models/user");

const {
  verifyToken,
  retrieveUser,
  getSearchableUsers,
} = require("../public/javascripts/userOperations");

const {
  CustomErr,
  setWildcardError,
  queryAppendError,
} = require("../public/javascripts/customErrors");

const {
  upload,
  uploadToS3,
  uploadToS3Middleware,
  deleteFromS3,
  calculateSHA256,
} = require("../public/javascripts/multerSetup");

// Default Routes That Redirect to Correct User's Route
router.get("/", verifyToken, async (req, res) => {
  try {
    await retrieveUserAndRedirect(req, res, "index");
  } catch {
    res.redirect("/");
  }
});

// Route to Display Private Folders
router.get("/private", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    await loadSearchableFolders(req, res, user, "private");
  } catch {
    res.redirect("/");
  }
});

// Route to Display Shared Folders
router.get("/shared", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    await loadSearchableFolders(req, res, user, "shared");
  } catch {
    res.redirect("/");
  }
});

// Route to Create New Folder
router.get("/create", verifyToken, async (req, res) => {
  try {
    await retrieveUserAndRedirect(req, res, "create");
  } catch {
    res.redirect("/");
  }
});

// Route to Add New Folder to Database
router.post("/create", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    const tripFolder = new TripFolder({
      folderName: req.body.folderName,
      tripDate: new Date(req.body.tripDate),
      users: [user.id],
    });
    const newTripFolder = await tripFolder.save();
    user.privateFolders.push(newTripFolder.id);
    await user.save();
    res.redirect(`/tripFolders/${newTripFolder.id}`);
  } catch {
    res.redirect(
      queryAppendError("/tripFolders/create", "Error creating folder")
    );
  }
});

// Route to Show Trip Folder
router.get("/:tripID", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  const sortBy = req.query.sortBy ? req.query.sortBy : null;
  const filterUser = req.query.filterUser ? req.query.filterUser : null;
  try {
    const tripFolder = await TripFolder.findById(req.params.tripID);
    const user = await retrieveUser(req, res);
    let usernames = await Promise.all(
      tripFolder.users.map(async (userID) => {
        try {
          const user = await User.findById(userID);
          return user.username;
        } catch {
          return "";
        }
      })
    );

    let tripFiles = await Promise.all(
      tripFolder.tripFiles.map(async (tripFileID) => {
        try {
          const curTripFile = await TripFile.findById(tripFileID);
          const uploadedBy = await User.findById(curTripFile.uploadedBy);
          if (!curTripFile || !uploadedBy) return null;
          if (filterUser && filterUser !== uploadedBy.username) return null;
          return curTripFile;
        } catch {
          return null;
        }
      })
    );
    tripFiles = tripFiles.filter((tripFile) => tripFile != null);
    sortTripFiles(tripFiles, sortBy);

    res.render("tripFolders/folderPage/show", {
      tripFolder: tripFolder,
      usernames: usernames,
      user: user,
      errorMessage: errorMessage,
      tripFiles: tripFiles,
      sortBy: sortBy || "",
      filterUser: filterUser || "",
      selectedNav: "tripFolders",
    });
  } catch (err) {
    res.redirect("/");
  }
});

// Add User to Folder Route
router.get("/:tripID/addUser", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  const successMessage = req.query.successMessage
    ? req.query.successMessage
    : null;
  try {
    const user = await retrieveUser(req, res);
    const users = await getSearchableUsers(req);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    res.render("tripFolders/folderPage/addUser", {
      user: user,
      tripFolder: tripFolder,
      users: users,
      errorMessage: errorMessage,
      successMessage: successMessage,
      selectedNav: "tripFolders",
    });
  } catch (err) {
    res.redirect(`/tripFolders/${req.params.tripID}`);
  }
});

// Route to add User to Trip Folder by creating new request
router.put("/:tripID/addUser", verifyToken, async (req, res) => {
  try {
    const tripFolder = await TripFolder.findById(req.params.tripID);
    const user = await retrieveUser(req, res);
    if (user.isPrivate)
      throw new CustomErr("User must be a shared account to add other users");
    if (!req.body.addUsername || req.body.addUsername === "")
      throw new CustomErr("Error adding selected user");
    const requestedUser = await User.findOne({
      username: req.body.addUsername,
    });
    if (tripFolder.users.indexOf(requestedUser.id) > -1)
      throw new CustomErr("Selected user already added to the current folder");
    if (!requestedUser) throw new CustomErr("Error adding selected user");
    if (requestedUser.isPrivate)
      throw new CustomErr("Selected user is private account");
    if (requestedUser.username === user.username)
      throw new CustomErr("Error: Cannot add self to folder");

    const inRequest = { user: user.id, tripFolder: tripFolder.id };
    const outRequest = { user: requestedUser.id, tripFolder: tripFolder.id };
    const notification = {
      user: user.id,
      tripFolder: tripFolder.id,
      notifType: "incomingRequest",
    };
    const requestExists = requestedUser.incomingRequests.some(
      (incomingRequest) =>
        incomingRequest.user.equals(inRequest.user) &&
        incomingRequest.tripFolder.equals(inRequest.tripFolder)
    );

    if (requestExists) {
      throw new CustomErr("Selected user has already been requested");
    } else {
      requestedUser.incomingRequests.push(inRequest);
      requestedUser.notifications.push(notification);
      requestedUser.newNotificationCount += 1;
      user.outgoingRequests.push(outRequest);
    }

    await tripFolder.save();
    await user.save();
    await requestedUser.save();
    const successMessage = `Successfully invited ${requestedUser.username} to join ${tripFolder.folderName}`;
    res.redirect(
      `/tripFolders/${tripFolder.id}/addUser?successMessage=${successMessage}`
    );
  } catch (err) {
    err = setWildcardError(err, "Error adding selected user");
    res.redirect(
      queryAppendError(`/tripFolders/${req.params.tripID}/addUser`, err)
    );
  }
});

// Route to Remove User from Folder
router.put("/:tripId/removeUser", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(req.params.tripId);
    const index = tripFolder.users.indexOf(user.id);
    const indexOfFolder = user.sharedFolders.indexOf(tripFolder.id);

    if (index > -1) tripFolder.users.splice(index, 1);
    else throw new CustomErr("Error removing user from trip folder");
    if (indexOfFolder > -1) user.sharedFolders.splice(indexOfFolder, 1);
    else throw new CustomErr("Error removing folder from user data");
    if (tripFolder.users.length === 1) {
      tripFolder.isShared = false;
      const remainingUser = await User.findById(tripFolder.users[0]);
      const indexOfFolder = remainingUser.sharedFolders.indexOf(tripFolder.id);
      if (indexOfFolder > -1) remainingUser.sharedFolders.splice(indexOfFolder);
      else throw new CustomErr("Error updating remaining user info");
      remainingUser.privateFolders.push(tripFolder.id);
      await remainingUser.save();
    }

    // Send notifications to remaining users in folder
    for (const folderUserID of tripFolder.users) {
      const folderUser = await User.findById(folderUserID);
      const notification = {
        user: user.id,
        tripFolder: tripFolder.id,
        notifType: "removeUser",
      };

      folderUser.notifications.push(notification);
      folderUser.newNotificationCount += 1;
      await folderUser.save();
    }

    await tripFolder.save();
    await user.save();
    res.redirect("/tripFolders");
  } catch (err) {
    err = setWildcardError(err, "Error removing user from trip folder");
    res.redirect(queryAppendError(`/tripFolders/${req.params.tripID}`, err));
  }
});

// Route to Edit Trip Folder
router.get("/:tripID/editFolder", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    res.render("tripFolders/folderPage/editFolder", {
      tripFolder: tripFolder,
      user: user,
      selectedNav: "tripFolders",
    });
  } catch (err) {
    res.redirect(`/tripFolders/${req.params.tripID}`);
  }
});

// Route to Update Trip Folder
router.put("/:tripID", verifyToken, async (req, res) => {
  let user = null;
  try {
    user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    tripFolder.folderName = req.body.folderName;
    tripFolder.tripDate = req.body.tripDate;
    await tripFolder.save();
    res.redirect(`/tripFolders/${tripFolder.id}`);
  } catch (err) {
    res.render("tripFolders/folderPage/editFolder", {
      errorMessage: "Error Updating Folder",
      user: user,
      tripFolder: tripFolder,
      selectedNav: "tripFolders",
    });
  }
});

// Route to Delete Trip Folder
router.delete("/:tripID", verifyToken, async (req, res) => {
  let user = null;
  try {
    user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    // delete all files in folder
    for (const tripFileID of tripFolder.tripFiles) {
      const tripFile = await TripFile.findById(tripFileID);
      await deleteFromS3(tripFile.imageURL);
      await tripFile.deleteOne();
    }

    if (tripFolder.isShared) {
      const indexOfFolder = user.sharedFolders.indexOf(tripFolder.id);
      if (indexOfFolder > -1) user.sharedFolders.splice(indexOfFolder, 1);
      else throw new CustomErr("Error removing folder from user info");
    } else {
      const indexOfFolder = user.privateFolders.indexOf(tripFolder.id);
      if (indexOfFolder > -1) user.privateFolders.splice(indexOfFolder, 1);
      else throw new CustomErr("Error removing folder from user info");
    }

    await tripFolder.deleteOne();
    await user.save();
    res.redirect("/tripFolders");
  } catch (err) {
    res.render("tripFolders/folderPage/show", {
      tripFolder: tripFolder,
      errorMessage: "Error Deleting Folder",
      user: user,
      selectedNav: "tripFolders",
    });
  }
});

// Route to Render Add Trip File
router.get("/:tripID/addFile", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    res.render("tripFiles/addFile", {
      tripFolder: tripFolder,
      user: user,
      selectedNav: "tripFolders",
    });
  } catch (err) {
    res.render("tripFolders/folderPage/show", {
      tripFolder: tripFolder,
      errorMessage: "Cannot add file at this time",
      user: user,
      selectedNav: "tripFolders",
    });
  }
});

router.post(
  "/:tripID/addFile",
  verifyToken,
  upload.single("image"),
  uploadToS3Middleware,
  async (req, res) => {
    try {
      const user = await retrieveUser(req, res);
      const tripFolder = await TripFolder.findById(req.params.tripID);

      if (!req.file) throw new CustomErr("No File Uploaded");

      const tripFile = new TripFile({
        title: req.body.title,
        description: req.body.description,
        userSetDate: req.body.userSetDate,
        uploadedBy: user.id,
        imageURL: req.file.location,
        imageHash: req.file.hash,
      });

      const newTripFile = await tripFile.save();
      tripFolder.tripFiles.push(newTripFile.id);
      await tripFolder.save();
      res.redirect(`/tripFolders/${tripFolder.id}`);
    } catch (err) {
      res.render("tripFolders/folderPage/show", {
        tripFolder: tripFolder,
        errorMessage: "Cannot add file at this time",
        user: user,
        selectedNav: "tripFolders",
      });
    }
  }
);

router.get("/:tripID/:fileID/editFile", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  try {
    const { tripID, fileID } = req.params;
    const user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(tripID);
    const tripFile = await TripFile.findById(fileID);
    res.render("tripFiles/edit", {
      user: user,
      tripFolder: tripFolder,
      tripFile: tripFile,
      errorMessage: errorMessage,
      selectedNav: "tripFolders",
    });
  } catch (err) {
    err = setWildcardError(err, "Error Editing Trip File");
    res.redirect(queryAppendError(`/tripFolders/${req.params.tripID}`, err));
  }
});

router.put(
  "/:tripID/:fileID/editFile",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    const { tripID, fileID } = req.params;
    try {
      const user = await retrieveUser(req, res);
      const tripFolder = await TripFolder.findById(tripID);
      const tripFile = await TripFile.findById(fileID);
      await verifyUserTripFile(tripFile, user);

      tripFile.title = req.body.title === "" ? null : req.body.title;
      tripFile.description =
        req.body.description === "" ? null : req.body.description;
      // update file if needed
      if (req.file) {
        const processedNewImage = await sharp(req.file.buffer)
          .webp({ quality: 10 })
          .withMetadata({})
          .toBuffer();
        const newImageHash = calculateSHA256(processedNewImage);
        if (newImageHash !== tripFile.imageHash) {
          await deleteFromS3(tripFile.imageURL);
          await uploadToS3(req, res);
          tripFile.imageURL = req.file.location;
          tripFile.imageHash = req.file.hash;
        }
      }
      tripFile.userSetDate = req.body.userSetDate;
      await tripFile.save();
      res.redirect(`/tripFolders/${tripFolder.id}/${tripFile.id}`);
    } catch (err) {
      err = setWildcardError(err, "Error Editing Trip File");
      res.redirect(
        queryAppendError(`/tripFolders/${tripID}/${fileID}/editFile`, err)
      );
    }
  }
);

router.delete("/:tripID/:fileID/editFile", verifyToken, async (req, res) => {
  const { tripID, fileID } = req.params;
  try {
    const user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(tripID);
    const tripFile = await TripFile.findById(fileID);
    await verifyUserTripFile(tripFile, user);
    const index = tripFolder.tripFiles.indexOf(tripFile.id);
    if (index > -1) tripFolder.tripFiles.splice(index, 1);
    else throw new CustomErr("Error removing file from trip folder");
    await tripFolder.save();
    await deleteFromS3(tripFile.imageURL);
    await tripFile.deleteOne();
    res.redirect(`/tripFolders/${tripFolder.id}`);
  } catch (err) {
    err = setWildcardError(err, "Error Deleting Trip File");
    res.redirect(
      queryAppendError(`/tripFolders/${tripID}/${fileID}/editFile`, err)
    );
  }
});

router.get("/:tripID/:fileID", verifyToken, async (req, res) => {
  try {
    const { tripID, fileID } = req.params;
    const user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(tripID);
    const tripFile = await TripFile.findById(fileID);
    const uploadedBy = await User.findById(tripFile.uploadedBy);

    res.render("tripFiles/show", {
      tripFolder: tripFolder,
      user: user,
      tripFile: tripFile,
      uploadedBy: uploadedBy.username,
      selectedNav: "tripFolders",
    });
  } catch (err) {
    err = setWildcardError(err, "Error Displaying Trip File");
    res.redirect(queryAppendError(`/tripFolders/${req.params.tripID}`, err));
  }
});

async function verifyUserTripFile(tripFile, user) {
  const uploadedBy = await User.findById(tripFile.uploadedBy);
  if (user.username !== uploadedBy.username)
    throw new CustomErr(
      "Error: only original uploader may edit file information"
    );
}

async function retrieveUserAndRedirect(req, res, route, tripFolders = null) {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  try {
    const user = await retrieveUser(req, res);
    res.render(`tripFolders/${route}`, {
      user: user,
      tripFolders: tripFolders,
      errorMessage: errorMessage,
      selectedNav: "tripFolders",
    });
  } catch (err) {
    res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
  }
}

async function loadSearchableFolders(req, res, user = null, folderType) {
  let searchOptions = {};
  if (req.query.folderName != null && req.query.folderName !== "")
    searchOptions.folderName = new RegExp(req.query.folderName, "i");

  if (user) searchOptions.users = user.id;
  else res.redirect("/");

  if (folderType === "private") {
    searchOptions.isShared = false;
    folderIDs = user.privateFolders;
  } else {
    searchOptions.isShared = true;
    folderIDs = user.sharedFolders;
  }

  if (user.isPrivate === true && folderType === "shared") {
    return res.render(`tripFolders/${folderType}`, {
      user: user,
      searchOptions: req.query,
      selectedNav: "tripFolders",
      errorMessage:
        "User must be a shared account to access! Please update user information.",
    });
  }

  try {
    const tripFolders = await TripFolder.find({
      _id: { $in: folderIDs },
      ...searchOptions,
    });
    res.render(`tripFolders/${folderType}`, {
      tripFolders: tripFolders,
      user: user,
      searchOptions: req.query,
      selectedNav: "tripFolders",
    });
  } catch {
    res.redirect("/");
  }
}

function sortTripFiles(tripFiles, sortBy) {
  if (!sortBy) return;
  if (sortBy === "setDate") {
    tripFiles.sort((a, b) => {
      return new Date(b.userSetDate) - new Date(a.userSetDate);
    });
  }
  if (sortBy === "uploadDate") {
    tripFiles.sort((a, b) => {
      return new Date(b.userSetDate) - new Date(a.userSetDate);
    });
  }
  if (sortBy === "title") {
    tripFiles.sort((a, b) => {
      const titleA = a.title ? a.title.toLowerCase() : "zzzzz";
      const titleB = b.title ? b.title.toLowerCase() : "zzzzz";
      if (titleA < titleB) return -1;
      if (titleA > titleB) return 1;
      return 0;
    });
  }
}

module.exports = router;
