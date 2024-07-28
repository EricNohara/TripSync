const express = require("express");
const router = express.Router();
const TripFolder = require("../models/tripFolder");
const User = require("../models/user");
const {
  verifyToken,
  retrieveUser,
} = require("../public/javascripts/userOperations");
const tripFolder = require("../models/tripFolder");

// Default Routes That Redirect to Correct User's Route
router.get("/", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
    await retrieveUserAndRedirect(req, res, "index");
  } catch (err) {
    res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
  }
});

router.get("/private", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
    const user = await retrieveUser(req, res);
    await loadSearchableFolders(req, res, user, "private");
  } catch (err) {
    res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
  }
});

router.get("/shared", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
    const user = await retrieveUser(req, res);
    await loadSearchableFolders(req, res, user, "shared");
  } catch (err) {
    res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
  }
});

router.get("/create", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
    await retrieveUserAndRedirect(req, res, "create");
  } catch (err) {
    res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
  }
});

router.post("/create", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
    const user = await retrieveUser(req, res);
    const tripFolder = new TripFolder({
      folderName: req.body.folderName,
      tripDate: new Date(req.body.tripDate),
      users: [user.id],
    });
    const newTripFolder = await tripFolder.save();
    res.redirect(`/tripFolders/${newTripFolder.id}`);
  } catch (err) {
    res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
  }
});

// Route to Show Trip Folder
router.get("/:tripID", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
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
    res.render("tripFolders/folderPage/show", {
      tripFolder: tripFolder,
      usernames: usernames,
      user: user,
    });
  } catch (err) {
    res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
  }
});

// Route to Edit Trip Folder
router.get("/:tripID/editFolder", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
    const user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    res.render("tripFolders/folderPage/editFolder", {
      tripFolder: tripFolder,
      user: user,
    });
  } catch (err) {
    if (err === req.authError)
      res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
    else res.redirect(`/tripFolders/${req.params.tripID}`);
  }
});

// Route to Update Trip Folder
router.put("/:tripID", verifyToken, async (req, res) => {
  let user = null;
  try {
    if (req.authError) throw req.authError;
    user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    tripFolder.folderName = req.body.folderName;
    tripFolder.tripDate = req.body.tripDate;
    await tripFolder.save();
    res.redirect(`/tripFolders/${tripFolder.id}`);
  } catch (err) {
    if (err === req.authError)
      res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
    else
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
    if (req.authError) throw req.authError;
    user = await retrieveUser(req, res);
    const tripFolder = await TripFolder.findById(req.params.tripID);
    await tripFolder.deleteOne();
    res.redirect("/tripFolders");
  } catch (err) {
    if (err === req.authError)
      res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
    else
      res.render("tripFolders/folderPage/show", {
        tripFolder: tripFolder,
        errorMessage: "Error Deleting Folder",
        user: user,
      });
  }
});

async function retrieveUserAndRedirect(
  req,
  res,
  redirectRoute,
  tripFolders = null
) {
  try {
    const user = await retrieveUser(req, res);
    res.render(`tripFolders/${redirectRoute}`, {
      user: user,
      tripFolders: tripFolders,
    });
  } catch (err) {
    res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
  }
}

async function loadSearchableFolders(req, res, user = null, folderType) {
  let searchOptions = {};
  if (req.query.folderName != null && req.query.folderName !== "") {
    searchOptions.folderName = new RegExp(req.query.folderName, "i");
  }

  if (user) {
    searchOptions.users = user.id;
  }

  if (folderType === "private") {
    searchOptions.isShared = false;
  } else {
    searchOptions.isShared = true;
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

module.exports = router;
