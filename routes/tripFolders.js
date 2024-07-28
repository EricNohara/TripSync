const express = require("express");
const User = require("../models/user");
const router = express.Router();
const {
  verifyToken,
  retrieveUser,
  handleVerifyTokenError,
} = require("../public/javascripts/userOperations");

// Default Routes That Redirect to Correct User's Route
router.get("/", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);
  await retrieveUserAndRedirect(req, res, "index");
});

router.get("/private", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);
  await retrieveUserAndRedirect(req, res, "private");
});

router.get("/shared", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);
  await retrieveUserAndRedirect(req, res, "shared");
});

router.get("/create", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);
  await retrieveUserAndRedirect(req, res, "create");
});

router.post("/create", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res);
  const user = await retrieveUser(req);
  res.send("done");
});

// Create Trips Route
router.get("/:id/create", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.render("tripFolders/create", { user: user });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

async function retrieveUserAndRedirect(req, res, redirectRoute) {
  try {
    const user = await retrieveUser(req);
    res.render(`tripFolders/${redirectRoute}`, { user: user });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
}

module.exports = router;
