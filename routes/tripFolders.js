const express = require("express");
const verifyToken = require("./users").verifyToken;
const User = require("../models/user");
const router = express.Router();

// Default Routes That Redirect to Correct User's Route
router.get("/", verifyToken, async (req, res) => {
  await retrieveUserFromTokenAndRedirect(req, res);
});

router.get("/private", verifyToken, async (req, res) => {
  await retrieveUserFromTokenAndRedirect(req, res, "private");
});

router.get("/shared", verifyToken, async (req, res) => {
  await retrieveUserFromTokenAndRedirect(req, res, "shared");
});

// All Trips Route
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.render("tripFolders/index", { user: user });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// Private Trips Route
router.get("/:id/private", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.render("tripFolders/private", { user: user });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// Shared Trips Route
router.get("/:id/shared", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.render("tripFolders/shared", { user: user });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

async function retrieveUserFromTokenAndRedirect(req, res, redirectRoute = "") {
  try {
    const user = await User.findOne({ email: req.user.email });
    res.redirect(`/tripFolders/${user.id}/${redirectRoute}`);
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
}

module.exports = router;
