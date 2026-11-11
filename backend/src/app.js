const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const env = require("./config/env");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const healthProfileRoutes = require("./routes/healthProfileRoutes");
const dailyRecordRoutes = require("./routes/dailyRecordRoutes");
const workoutRoutes = require("./routes/workoutRoutes");
const sleepRoutes = require("./routes/sleepRoutes");
const foodRoutes = require("./routes/foodRoutes");
const goalRoutes = require("./routes/goalRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");
if (env.NODE_ENV === "production") app.set("trust proxy", 1); // needed for secure cookies behind a proxy

app.use(
  cors({
    origin: env.CLIENT_URL, // exact origin, never "*" when credentials are used
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Auth and health data must never be cached by browsers or proxies.
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/health-profile", healthProfileRoutes);
app.use("/api/daily-records", dailyRecordRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/sleep", sleepRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/goals", goalRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
