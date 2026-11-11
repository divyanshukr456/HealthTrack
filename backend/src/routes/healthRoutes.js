const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// GET /api/health
router.get("/", (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  res.status(200).json({
    success: true,
    message: "HealthTrack API is running",
    database: dbStates[mongoose.connection.readyState],
  });
});

module.exports = router;
