const mongoose = require("mongoose");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { COOKIE_NAME, verifyToken, clearAuthCookie } = require("../utils/token");

// Protects a route: verifies the JWT cookie and attaches the user to req.user.
const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) throw new AppError("Authentication required", 401);

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    clearAuthCookie(res);
    throw new AppError("Invalid or expired session. Please log in again", 401);
  }

  const user = mongoose.isValidObjectId(payload.sub) ? await User.findById(payload.sub) : null;
  if (!user) {
    clearAuthCookie(res);
    throw new AppError("Invalid or expired session. Please log in again", 401);
  }

  req.user = user;
  next();
});

module.exports = { protect };
