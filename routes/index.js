const express = require("express");
const router = express.Router();
const {
  retrieveUser,
  verifyToken,
  handleVerifyTokenError,
} = require("../public/javascripts/userOperations");

router.get("/", verifyToken, async (req, res) => {
  handleVerifyTokenError(req, res, false); // dont show the error message
  try {
    const user = await retrieveUser(req);
    res.render("index", { user: user });
  } catch {
    res.render("index");
  }
});

module.exports = router;
