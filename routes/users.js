// Route for login, log out, and sign up
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();
const {
  verifyToken,
  getSearchableUsers,
  retrieveUser,
  isAlphaNumeric,
} = require("../public/javascripts/userOperations");
const {
  CustomErr,
  setWildcardError,
} = require("../public/javascripts/customErrors");

// Home Page to Search for Users
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    const users = await getSearchableUsers(req);
    res.render("users/index", {
      users: users,
      user: user,
      searchOptions: req.query,
    });
  } catch (err) {
    res.redirect("/");
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
    if (!user) throw new CustomErr("Invalid Email");

    // Authenticate inputted password
    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!passwordMatch) throw new CustomErr("Password Incorrect");

    // Generate JWT token
    const token = jwt.sign({ userID: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });
    res.redirect("/");
  } catch (err) {
    err = setWildcardError(err, "Error: Something went wrong");
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
    if (!isAlphaNumeric(req.body.username))
      throw new CustomErr("Username must contain only alphanumeric characters");

    const existingUserByEmail = await User.findOne({
      email: req.body.email,
    });
    if (existingUserByEmail)
      throw new CustomErr("Account with current email already exists!");

    const existingUserByUsername = await User.findOne({
      username: req.body.username,
    });
    if (existingUserByUsername && existingUserByUsername !== user.username)
      throw new CustomErr("Account with current username already exists");

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      isPrivate: req.body.isPrivate === "false" ? false : true,
    });

    await newUser.save();
    // Generate JWT token
    const token = jwt.sign({ userID: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });
    res.redirect("/");
  } catch (err) {
    err = setWildcardError(err, "Error: Something went wrong");
    res.render("users/register", { errorMessage: err });
  }
});

// Edit User Info Route
router.get("/edit", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  try {
    const user = await retrieveUser(req, res);
    res.render("users/edit", { user: user, errorMessage: errorMessage });
  } catch (err) {
    err = setWildcardError(err, "Error editing user");
    res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
  }
});

router.put("/edit", verifyToken, async (req, res) => {
  try {
    if (!isAlphaNumeric(req.body.username))
      throw new CustomErr("Username must contain only alphanumeric characters");

    const user = await retrieveUser(req, res);
    const existingUserByEmail = await User.findOne({
      email: req.body.email,
    });
    if (existingUserByEmail && existingUserByEmail.email !== user.email)
      throw new CustomErr("Account with inputted email already exists");

    const existingUserByUsername = await User.findOne({
      username: req.body.username,
    });
    if (existingUserByUsername && existingUserByUsername !== user.username)
      throw new CustomErr("Account with inputted username already exists");

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user.username = req.body.username;
    user.email = req.body.email;
    user.password = hashedPassword;
    user.isPrivate = req.body.isPrivate === "false" ? false : true;
    await user.save();
    res.redirect("/");
  } catch (err) {
    err = setWildcardError(err, "Error updating user");
    res.redirect(`/users/edit?errorMessage=${encodeURIComponent(err)}`);
  }
});

// Logging Out Route
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/users/login");
});

// Get Delete Route
router.get("/delete", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  try {
    const user = await retrieveUser(req, res);
    res.render("users/delete", { errorMessage: errorMessage, user: user });
  } catch {
    res.redirect("/");
  }
});

// Delete User Route
router.delete("/delete", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (req.body.email !== user.email) throw new CustomErr("Email Incorrect");
    if (!passwordMatch) throw new CustomErr("Password Incorrect");
    await user.deleteOne();
    res.redirect("/users/logout");
  } catch (err) {
    err = setWildcardError(err, "Error deleting user");
    res.redirect(`/users/delete?errorMessage=${encodeURIComponent(err)}`);
  }
});

module.exports = router;
