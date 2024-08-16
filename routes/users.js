// Route for login, log out, and sign up
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
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
const sendPasswordResetEmail = require("../public/javascripts/sendEmail");

// Home Page to Search for Users
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    const users = await getSearchableUsers(req);
    res.render("users/index", {
      users: users,
      user: user,
      searchOptions: req.query,
      selectedNav: "users",
    });
  } catch (err) {
    res.redirect("/");
  }
});

// Forgot Password Route
router.get("/forgotPassword", (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  const successMessage = req.query.successMessage
    ? req.query.successMessage
    : null;
  res.render("users/forgotPassword", {
    errorMessage: errorMessage,
    successMessage: successMessage,
  });
});

// Send Reset Password Email Route
router.post("/sendPasswordResetEmail", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) throw new CustomErr("Invalid Email");

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetTokenExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/users/resetPassword?user=${user.id}&token=${resetToken}`;

    const subject = "TripSync Password Reset";
    const htmlString = `<p>Click the link below to reset your password.</p><a href=${resetUrl}>Reset Password</a>`;
    const { success, message } = await sendPasswordResetEmail(
      user,
      subject,
      htmlString
    );

    if (!success) throw new CustomErr(message);

    res.redirect(`/users/forgotPassword?successMessage=${message}`);
  } catch (err) {
    err = setWildcardError(err, "Error sending email");
    res.redirect(queryAppendError("/users/forgotPassword", err));
  }
});

// Reset Password Route
router.get("/resetPassword", async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  try {
    const user = await User.findById(req.query.user);
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.query.token)
      .digest("hex");

    if (hashedToken !== user.passwordResetToken)
      throw new CustomErr(
        "Invalid token: resend verification email to continue"
      );

    if (Date.now() > user.passwordResetTokenExpires)
      throw new CustomErr(
        "Expired token: resend verification email to continue"
      );

    res.render("users/resetPassword", {
      user: user,
      errorMessage: errorMessage,
      token: req.query.token,
    });
  } catch (err) {
    err = setWildcardError(
      err,
      "Error validating token: resend verification email to continue"
    );
    res.redirect(queryAppendError("/users/forgotPassword", err));
  }
});

// Resetting User Password Put Route
router.put("/resetPassword", async (req, res) => {
  try {
    if (req.body.newPassword !== req.body.confirmPassword)
      throw new CustomErr("Passwords must match");

    const user = await User.findById(req.query.user);
    const newHashedPassword = await bcrypt.hash(req.body.newPassword, 10);

    user.password = newHashedPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    await user.save();
    res.redirect("/users/login");
  } catch (err) {
    err = setWildcardError(err, "Error Resetting Password");
    res.redirect(
      `/users/resetPassword?user=${req.query.user}&token=${req.query.token}&errorMessage=${err.message}`
    );
  }
});

// Login Route
router.get("/login", (req, res) => {
  res.render("users/login", { selectedNav: "login" });
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
    if (!passwordMatch) throw new CustomErr("Password incorrect");

    // Generate JWT token
    const token = jwt.sign({ userID: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });
    res.redirect("/");
  } catch (err) {
    err = setWildcardError(err, "Error: something went wrong");
    res.render("users/login", {
      errorMessage: err.message,
      selectedNav: "login",
    });
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

// Edit User Info Route in Settings
router.get("/settings", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  try {
    const user = await retrieveUser(req, res);
    res.render("users/settings", {
      user: user,
      errorMessage: errorMessage,
      selectedNav: "settings",
    });
  } catch (err) {
    err = setWildcardError(err, "Error editing user");
    res.redirect(queryAppendError("/", err));
  }
});

router.put("/settings", verifyToken, async (req, res) => {
  try {
    const formAction = req.body.action;
    if (formAction === "delete") return res.redirect("/users/delete");

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
    res.redirect(queryAppendError("/users/settings", err));
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
      const notification = {
        user: user.id,
        tripFolder: folder.id,
        notifType: "removeUser",
        fallbackUsername: user.username,
        fallbackFolderName: folder.folderName,
      };

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

      if (folder.users.length === 1) {
        folder.isShared = false;
        const remUser = await User.findById(folder.users[0]);
        remUser.privateFolders.push(folder.id);
        const indexOfFolder = remUser.sharedFolders.indexOf(folder.id);
        if (indexOfFolder > -1) remUser.sharedFolders.splice(indexOfFolder, 1);
        else throw new CustomErr("Error removing folder from user data");
        remUser.notifications.push(notification);
        remUser.newNotificationCount += 1;
        await remUser.save();
      } else {
        // send notification to remaining users
        for (const remainingUserID of folder.users) {
          const remainingUser = await User.findById(remainingUserID);
          remainingUser.notifications.push(notification);
          remainingUser.newNotificationCount += 1;
          await remainingUser.save();
        }
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
