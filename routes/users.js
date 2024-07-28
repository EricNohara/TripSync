// Route for login, log out, and sign up
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();
const { verifyToken } = require("../public/javascripts/userOperations");

// Home Page to Search for Users
router.get("/", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
    const user = await User.findOne({ email: req.user.email });
    loadSearchableUsers(req, res, user);
  } catch (err) {
    if (err == req.authError) {
      res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
    } else {
      res.redirect("/");
    }
  }
});

// Login Route
router.get("/login", (req, res) => {
  res.render("users/login");
});

//User Login Authentication Route
router.post("/login", async (req, res) => {
  try {
    // Find user by inputted email
    const user = await User.findOne({ email: req.body.email });
    if (!user) throw "Invalid Email";

    // Authenticate inputted password
    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!passwordMatch) throw "Password Incorrect";

    // Generate JWT token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });
    res.render("index", { user: user });
  } catch (err) {
    res.render("users/login", { errorMessage: err });
  }
});

// Register Route
router.get("/register", (req, res) => {
  res.render("users/register");
});

// Create User Route
router.post("/register", async (req, res) => {
  try {
    const existingUser = await User.findOne({
      email: req.body.email,
    });
    if (existingUser) throw "Account with current email already exists!";

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
    });

    await newUser.save();
    // Generate JWT token
    const token = jwt.sign({ email: newUser.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });
    res.render("index", { user: newUser });
  } catch (err) {
    res.render("users/register", {
      errorMessage: err,
    });
  }
});

// Logging Out Route
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/users/login");
});

// helper function to load all users based on query
async function loadSearchableUsers(req, res, user = null) {
  let searchOptions = {};
  if (req.query.username != null && req.query.username !== "") {
    searchOptions.username = new RegExp(req.query.username, "i");
  }

  try {
    const users = await User.find(searchOptions);
    res.render("users/index", {
      users: users,
      user: user,
      searchOptions: req.query,
    });
  } catch {
    res.redirect("/");
  }
}

module.exports = router;
