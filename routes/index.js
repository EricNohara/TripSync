const express = require("express");
const router = express.Router();
const {
  retrieveUser,
  verifyToken,
  handleVerifyTokenError,
} = require("../public/javascripts/userOperations");

router.get("/", verifyToken, async (req, res) => {
  const errorMessage = req.query.errorMessage ? req.query.errorMessage : null;
  try {
    const user = await retrieveUser(req);
    res.render("index", { user: user });
  } catch {
    res.render("index", { errorMessage: errorMessage });
  }
});

module.exports = router;
