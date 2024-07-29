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
} = require("../public/javascripts/userOperations");

// Home Page to Search for Users
router.get("/", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
    const user = await User.findOne({ email: req.user.email });
    const users = await getSearchableUsers(req);
    res.render("users/index", {
      users: users,
      user: user,
      searchOptions: req.query,
    });
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
    res.redirect("/");
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
      isPrivate: req.body.isPrivate === "false" ? false : true,
    });

    await newUser.save();
    // Generate JWT token
    const token = jwt.sign({ email: newUser.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });
    res.redirect("/");
  } catch (err) {
    res.render("users/register", {
      errorMessage: err,
    });
  }
});

// Edit User Info Route
router.get("/edit", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  try {
    if (req.authError) throw req.authError;
    const user = await retrieveUser(req, res);
    res.render("users/edit", { user: user, errorMessage: errorMessage });
  } catch (err) {
    if (err === req.authError)
      res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
    else
      res.redirect(
        `/?errorMessage=${encodeURIComponent("Error editing user")}`
      );
  }
});

router.put("/edit", verifyToken, async (req, res) => {
  try {
    if (req.authError) throw req.authError;
    const user = await retrieveUser(req, res);
    const existingUser = await User.findOne({
      email: req.body.email,
    });
    if (existingUser && existingUser.email != user.email)
      throw "Account with current email already exists!";
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user.username = req.body.username;
    user.email = req.body.email;
    user.password = hashedPassword;
    user.isPrivate = req.body.isPrivate === "false" ? false : true;
    await user.save();
    res.redirect("/");
  } catch (err) {
    if (err === req.authError)
      res.redirect(`/?errorMessage=${encodeURIComponent(err)}`);
    else if (err === "Account with current email already exists!") {
      res.redirect(
        `/users/edit?errorMessage=${encodeURIComponent(
          "Account with current email already exists!"
        )}`
      );
    } else {
      res.redirect(
        `/users/edit?errorMessage=${encodeURIComponent("Error updating user.")}`
      );
    }
  }
});

// Logging Out Route
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/users/login");
});

module.exports = router;
