const express = require("express");
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
const { upload, uploadToS3 } = require("../public/javascripts/multerSetup");

const imageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/tiff",
  "image/svg+xml",
];

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
    });
  } catch (err) {
    res.redirect("/");
  }
});

// Add User to Folder Route
router.get("/:tripID/addUser", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  try {
    const user = await retrieveUser(req, res);
    const users = await getSearchableUsers(req);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    res.render("tripFolders/folderPage/addUser", {
      user: user,
      tripFolder: tripFolder,
      users: users,
      errorMessage: errorMessage,
    });
  } catch (err) {
    console.error(err);
    res.redirect(`/tripFolders/${req.params.tripID}`);
  }
});

// Route to Edit add User to Trip Folder
router.put("/:tripID/addUser", verifyToken, async (req, res) => {
  let user = null;
  try {
    const tripFolder = await TripFolder.findById(req.params.tripID);
    user = await retrieveUser(req, res);
    if (user.isPrivate)
      throw new CustomErr("User must be a shared account to add other users");
    if (!req.body.addUsername || req.body.addUsername === "")
      throw new CustomErr("Error adding selected user");
    const addedUser = await User.findOne({ username: req.body.addUsername });
    if (tripFolder.users.indexOf(addedUser.id) > -1)
      throw new CustomErr("Selected user already added to the current folder");
    if (!addedUser) throw new CustomErr("Error adding selected user");
    if (addedUser.isPrivate)
      throw new CustomErr("Selected user is private account");
    if (addedUser.username === user.username)
      throw new CustomErr("Error: Cannot add self to folder");

    tripFolder.users.push(addedUser.id);
    tripFolder.isShared = true;
    await tripFolder.save();
    res.redirect(`/tripFolders/${tripFolder.id}`);
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
    if (index > -1) tripFolder.users.splice(index, 1);
    else throw new CustomErr("Error removing user from trip folder");
    if (tripFolder.users.length === 1) tripFolder.isShared = false;
    await tripFolder.save();
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
    });
  }
});

// Route to Delete Trip Folder
router.delete("/:tripID", verifyToken, async (req, res) => {
  let user = null;
  try {
    user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    await tripFolder.deleteOne();
    tripFolder.tripFiles;
    res.redirect("/tripFolders");
  } catch (err) {
    res.render("tripFolders/folderPage/show", {
      tripFolder: tripFolder,
      errorMessage: "Error Deleting Folder",
      user: user,
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
    });
  } catch (err) {
    res.render("tripFolders/folderPage/show", {
      tripFolder: tripFolder,
      errorMessage: "Cannot add file at this time",
      user: user,
    });
  }
});

router.post(
  "/:tripID/addFile",
  verifyToken,
  upload.single("image"),
  uploadToS3,
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
      });

      // console.log(tripFile.imageURL);

      const newTripFile = await tripFile.save();
      tripFolder.tripFiles.push(newTripFile.id);
      await tripFolder.save();

      res.redirect(`/tripFolders/${tripFolder.id}`);
    } catch (err) {
      console.error(err);
      res.render("tripFolders/folderPage/show", {
        tripFolder: tripFolder,
        errorMessage: "Cannot add file at this time",
        user: user,
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
    });
  } catch (err) {
    err = setWildcardError(err, "Error Editing Trip File");
    res.redirect(queryAppendError(`/tripFolders/${req.params.tripID}`, err));
  }
});

router.put("/:tripID/:fileID/editFile", verifyToken, async (req, res) => {
  const { tripID, fileID } = req.params;
  try {
    const user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(tripID);
    const tripFile = await TripFile.findById(fileID);
    await verifyUserTripFile(tripFile, user);

    tripFile.title = req.body.title === "" ? null : req.body.title;
    tripFile.description =
      req.body.description === "" ? null : req.body.description;
    if (req.body.image) saveImage(tripFile, req.body.image);
    tripFile.userSetDate = req.body.userSetDate;
    await tripFile.save();
    res.redirect(`/tripFolders/${tripFolder.id}/${tripFile.id}`);
  } catch (err) {
    err = setWildcardError(err, "Error Editing Trip File");
    res.redirect(
      queryAppendError(`/tripFolders/${tripID}/${fileID}/editFile`, err)
    );
  }
});

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

  if (folderType === "private") searchOptions.isShared = false;
  else searchOptions.isShared = true;

  if (user.isPrivate === true) {
    return res.render(`tripFolders/${folderType}`, {
      user: user,
      searchOptions: req.query,
      errorMessage:
        "User must be a shared account to access! Please update user information.",
    });
  }

  try {
    const tripFolders = await TripFolder.find(searchOptions);
    res.render(`tripFolders/${folderType}`, {
      tripFolders: tripFolders,
      user: user,
      searchOptions: req.query,
    });
  } catch {
    res.redirect("/");
  }
}

function saveImage(tripFile, imgEncoded) {
  if (imgEncoded == null) return;
  const image = JSON.parse(imgEncoded);
  if (image != null && imageMimeTypes.includes(image.type)) {
    tripFile.image = new Buffer.from(image.data, "base64");
    tripFile.imageType = image.type;
    const imageSize = Buffer.byteLength(tripFile.image, "base64");
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
