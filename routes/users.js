// Route for login, log out, and sign up
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("This is the users index page.");
});

// Login Route
router.get("/login", (req, res) => {
  res.render("users/login");
});

// Sign Up Route
router.get("/signup", (req, res) => {
  res.send("This is the user sign up page.");
});

module.exports = router;
