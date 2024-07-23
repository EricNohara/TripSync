const express = require("express");
const router = express.Router();

// const testUser = { name: "Eric Nohara-LeClair" };
const testUser = null;

router.get("/", (req, res) => {
  res.render("index", { user: testUser });
});

module.exports = router;
