const express = require("express");
const { register, login, logout, me } = require("../controllers/authController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { registerSchema, loginSchema } = require("../validators/authValidator");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", protect, me);

module.exports = router;
