const jwt = require("jsonwebtoken");
const env = require("../config/env");

const COOKIE_NAME = "token";
const DAY_MS = 24 * 60 * 60 * 1000;

const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: `${env.JWT_EXPIRES_IN_DAYS}d`,
  });

// Throws if the token is invalid, tampered with or expired.
const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });

// clearCookie must use the same options as when the cookie was set (minus maxAge).
const baseCookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser cannot read it (XSS protection)
  secure: env.NODE_ENV === "production", // HTTPS only in production
  sameSite: "lax", // not sent on cross-site POST/PATCH/DELETE (CSRF protection)
  path: "/",
});

const setAuthCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, { ...baseCookieOptions(), maxAge: env.JWT_EXPIRES_IN_DAYS * DAY_MS });

const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, baseCookieOptions());

module.exports = { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie };
