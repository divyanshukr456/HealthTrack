const express = require("express");
const { getProfile, updateProfile, deleteProfile } = require("../controllers/healthProfileController");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { updateHealthProfileSchema } = require("../validators/healthProfileValidator");

const router = express.Router();

router.use(protect);
router.get("/", getProfile);
router.patch("/", validate(updateHealthProfileSchema), updateProfile);
router.delete("/", deleteProfile);

module.exports = router;
