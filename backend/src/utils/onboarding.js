const HealthProfile = require("../models/HealthProfile");
const { ONBOARDING_PATH } = require("./constants");

// Tells the frontend whether to send the user to the onboarding page.
const getOnboardingState = async (userId) => {
  const profile = await HealthProfile.findOne({ userId }).select("completedAt").lean();
  return profile
    ? { completed: true, completedAt: profile.completedAt, redirectTo: null }
    : { completed: false, completedAt: null, redirectTo: ONBOARDING_PATH };
};

module.exports = { getOnboardingState };
