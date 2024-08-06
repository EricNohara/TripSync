// Route for login, log out, and sign up
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const TripFolder = require("../models/tripFolder");
const TripFile = require("../models/tripFile");
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
  queryAppendError,
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
    res.render("users/login", { errorMessage: err.message });
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
    res.render("users/register", { errorMessage: err.message });
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
    res.redirect(queryAppendError("/", err));
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
    if (
      existingUserByUsername &&
      existingUserByUsername.username !== user.username
    )
      throw new CustomErr("Account with inputted username already exists");

    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!passwordMatch)
      throw new CustomErr("Password incorrect: Cannot edit user information");

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
    user.email = req.body.email;
    user.username = req.body.username;
    user.password = hashedPassword;
    user.isPrivate = req.body.isPrivate === "false" ? false : true;

    await user.save();
    res.redirect("/");
  } catch (err) {
    err = setWildcardError(err, "Error updating user");
    res.redirect(queryAppendError("/users/edit", err));
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

    // Delete user from all folders and remove all files user uploaded to those folders
    const userFolders = await TripFolder.find({ users: user.id });
    for (const folder of userFolders) {
      const notification = `${user.username} left shared folder: ${folder.folderName}`;
      const userFilesInFolder = await TripFile.find({
        _id: { $in: folder.tripFiles },
        uploadedBy: user.id,
      });

      for (const file of userFilesInFolder) {
        const index = folder.tripFiles.indexOf(file.id);
        if (index > -1) folder.tripFiles.splice(index, 1);
        await file.deleteOne();
      }

      const index = folder.users.indexOf(user.id);
      if (index > -1) folder.users.splice(index, 1);

      // send notification to remaining user
      for (const remainingUserID of folder.users) {
        const remainingUser = await User.findById(remainingUserID);
        remainingUser.notifications.push(notification);
        remainingUser.newNotificationCount += 1;
        await remainingUser.save();
      }

      // Delete all pending requests made by user
      for (const outgoingRequest of user.outgoingRequests) {
        const requestedUser = await User.findById(outgoingRequest.user);
        const tripFolder = await TripFolder.findById(
          outgoingRequest.tripFolder
        );
        const indexOfRequest = requestedUser.incomingRequests.findIndex(
          (incomingRequest) =>
            incomingRequest.user.equals(user.id) &&
            incomingRequest.tripFolder.equals(tripFolder.id)
        );
        if (indexOfRequest > -1)
          requestedUser.incomingRequests.splice(indexOfRequest, 1);

        const indexOfNotification = requestedUser.notifications.findIndex(
          (notif) =>
            notif ===
            `${user.username} has invited you to join a folder named: ${tripFolder.folderName}`
        );
        if (indexOfNotification > -1)
          requestedUser.notifications.splice(indexOfNotification, 1);

        await requestedUser.save();
      }

      await folder.save();
    }

    await user.deleteOne();
    res.redirect("/users/logout");
  } catch (err) {
    err = setWildcardError(err, "Error deleting user");
    res.redirect(queryAppendError("/users/delete", err));
  }
});

module.exports = router;
