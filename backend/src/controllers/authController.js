const bcrypt = require("bcrypt");
const User = require("../models/User");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { signToken, setAuthCookie, clearAuthCookie } = require("../utils/token");
const { getOnboardingState } = require("../utils/onboarding");

// Used when the email does not exist, so response time looks the same as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("healthtrack-dummy-password", env.BCRYPT_SALT_ROUNDS);

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, dob } = req.body; // already validated by Zod

  const existing = await User.findOne({ email });
  if (existing) throw new AppError("Email is already registered", 409);

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    dob: new Date(`${dob}T00:00:00.000Z`),
  });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: { user }, // toJSON strips password and __v
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  const hash = user ? user.password : DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hash);

  // Same message for "no such email" and "wrong password" (no user enumeration on login).
  if (!user || !passwordOk) throw new AppError("Invalid email or password", 401);

  setAuthCookie(res, signToken(user._id));

  const onboarding = await getOnboardingState(user._id);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user, onboarding }, // the token is only in the HTTP-only cookie, never in the body
  });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/me  (protected)
const me = asyncHandler(async (req, res) => {
  const onboarding = await getOnboardingState(req.user._id);
  res.status(200).json({ success: true, data: { user: req.user, onboarding } });
});

module.exports = { register, login, logout, me };
