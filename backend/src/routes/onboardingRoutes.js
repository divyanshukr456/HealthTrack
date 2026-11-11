const express = require("express");
const { getStatus, createProfile } = require("../controllers/healthProfileController");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { createHealthProfileSchema } = require("../validators/healthProfileValidator");

const router = express.Router();

router.use(protect);
router.get("/status", getStatus);
router.post("/health-profile", validate(createHealthProfileSchema), createProfile);

module.exports = router;
