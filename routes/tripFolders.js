const express = require("express");
const router = express.Router();
const TripFolder = require("../models/tripFolder");
const User = require("../models/user");
const {
  verifyToken,
  retrieveUser,
  handleVerifyTokenError,
} = require("../public/javascripts/userOperations");
const { urlencoded } = require("body-parser");
const { search } = require(".");

// Default Routes That Redirect to Correct User's Route
router.get("/", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);
  await retrieveUserAndRedirect(req, res, "index");
});

router.get("/private", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);
  try {
    const user = await retrieveUser(req, res);
    await loadSearchableFolders(req, res, user, "private");
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

router.get("/shared", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);
  try {
    const user = await retrieveUser(req, res);
    await loadSearchableFolders(req, res, user, "shared");
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

router.get("/create", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);
  await retrieveUserAndRedirect(req, res, "create");
});

router.post("/create", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);

  try {
    const user = await retrieveUser(req, res);
    const tripFolder = new TripFolder({
      folderName: req.body.folderName,
      tripDate: new Date(req.body.tripDate),
      users: [user.id],
    });
    const newTripFolder = await tripFolder.save();
    res.redirect(`/tripFolders/private/${newTripFolder.id}`);
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

router.get("/private/:tripID", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);

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
    res.render("tripFolders/show", {
      tripFolder: tripFolder,
      usernames: usernames,
      user: user,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/");
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
    console.error(err);
    res.redirect("/");
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
