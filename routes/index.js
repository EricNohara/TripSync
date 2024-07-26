const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

router.get("/", redirectUserIndexPage, (req, res) => {
  res.render("index");
});

function redirectUserIndexPage(req, res, next) {
  const token =
    req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
  if (!token) return next();

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return next();
    const user = await User.findOne({ email: decoded.email });
    if (user) return res.redirect(`/users/${user.id}`);
    else next();
  });
}

module.exports = router;
