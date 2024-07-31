const express = require("express");
const router = express.Router();
const {
  retrieveUser,
  verifyToken,
  handleVerifyTokenError,
} = require("../public/javascripts/userOperations");

router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await retrieveUser(req, res);
    res.render("index", { user: user });
  } catch {
    res.render("index");
  }
});

router.get("/authError", (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  res.render("index", { errorMessage: errorMessage });
});

module.exports = router;
