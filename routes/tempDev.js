const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

router.get("/clear-database", async (req, res) => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await mongoose.connection.db.dropDatabase();
    console.log("Database successfully cleared.");
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

module.exports = router;
