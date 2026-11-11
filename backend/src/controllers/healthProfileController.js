const HealthProfile = require("../models/HealthProfile");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { CONSENT_VERSION } = require("../utils/constants");
const { getOnboardingState } = require("../utils/onboarding");
const { createHealthProfileSchema } = require("../validators/healthProfileValidator");

// Turns validated data into the fields we store. Consent timestamp/version are set by the
// server, never taken from the client. Withdrawing consent wipes the consent record.
const buildFields = (data, existingConsent) => {
  const given = data.consent && data.consent.medicalDataConsent === true;
  const alreadyConsented = existingConsent && existingConsent.medicalDataConsent === true;

  return {
    gender: data.gender,
    height: data.height,
    weight: data.weight,
    activityLevel: data.activityLevel,
    medicalStatus: data.medicalStatus ?? null,
    medicalConditions: data.medicalConditions ?? [],
    allergies: {
      hasAllergies: data.allergies?.hasAllergies ?? null,
      items: data.allergies?.items ?? [],
    },
    consent: given
      ? {
          medicalDataConsent: true,
          consentedAt: alreadyConsented ? existingConsent.consentedAt : new Date(),
          consentVersion: alreadyConsented ? existingConsent.consentVersion : CONSENT_VERSION,
        }
      : { medicalDataConsent: false, consentedAt: null, consentVersion: null },
  };
};

// Current stored profile in the same shape the validator expects (for PATCH merging).
const toValidatorShape = (p) => ({
  gender: p.gender,
  height: p.height,
  weight: p.weight,
  activityLevel: p.activityLevel,
  medicalStatus: p.medicalStatus,
  medicalConditions: p.medicalConditions || [],
  allergies: {
    hasAllergies: p.allergies ? p.allergies.hasAllergies : null,
    items: ((p.allergies && p.allergies.items) || []).map((i) => ({ name: i.name, type: i.type })),
  },
  consent: { medicalDataConsent: !!(p.consent && p.consent.medicalDataConsent) },
});

const MEDICAL_KEYS = ["medicalStatus", "medicalConditions", "allergies"];

// GET /api/onboarding/status
const getStatus = asyncHandler(async (req, res) => {
  const onboarding = await getOnboardingState(req.user._id);
  res.status(200).json({ success: true, data: { onboarding } });
});

// POST /api/onboarding/health-profile
const createProfile = asyncHandler(async (req, res) => {
  // userId always comes from the verified JWT (req.user), never from the request body.
  const exists = await HealthProfile.exists({ userId: req.user._id });
  if (exists) throw new AppError("Health profile already exists. Use PATCH /api/health-profile to edit it", 409);

  const profile = await HealthProfile.create({
    userId: req.user._id,
    ...buildFields(req.body, null),
    completedAt: new Date(),
  });

  res.status(201).json({
    success: true,
    message: "Health profile created",
    data: { healthProfile: profile, onboarding: { completed: true, completedAt: profile.completedAt, redirectTo: null } },
  });
});

// GET /api/health-profile
const getProfile = asyncHandler(async (req, res) => {
  const profile = await HealthProfile.findOne({ userId: req.user._id });
  if (!profile) throw new AppError("Health profile not found", 404);
  res.status(200).json({ success: true, data: { healthProfile: profile } });
});

// PATCH /api/health-profile
const updateProfile = asyncHandler(async (req, res) => {
  const patch = req.body; // shape already validated by Zod
  const profile = await HealthProfile.findOne({ userId: req.user._id }); // ownership via query
  if (!profile) throw new AppError("Health profile not found", 404);

  const current = toValidatorShape(profile.toObject());
  const merged = {
    ...current,
    ...patch,
    allergies: { ...current.allergies, ...(patch.allergies || {}) },
    consent: { ...current.consent, ...(patch.consent || {}) },
  };

  // Changing an answer away from "yes" clears the dependent list (unless a new list is sent).
  if (patch.medicalStatus !== undefined && patch.medicalStatus !== "yes" && patch.medicalConditions === undefined) {
    merged.medicalConditions = [];
  }
  if (patch.allergies && patch.allergies.hasAllergies !== undefined && patch.allergies.hasAllergies !== "yes" && patch.allergies.items === undefined) {
    merged.allergies.items = [];
  }
  // Withdrawing consent (without sending new medical data) erases the stored medical data.
  const withdrawing = patch.consent && patch.consent.medicalDataConsent === false;
  if (withdrawing && !MEDICAL_KEYS.some((k) => patch[k] !== undefined)) {
    merged.medicalStatus = null;
    merged.medicalConditions = [];
    merged.allergies = { hasAllergies: null, items: [] };
  }

  const result = createHealthProfileSchema.safeParse(merged);
  if (!result.success) {
    throw new AppError(
      "Validation failed",
      400,
      result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    );
  }

  profile.set(buildFields(result.data, profile.consent));
  await profile.save();

  res.status(200).json({ success: true, message: "Health profile updated", data: { healthProfile: profile } });
});

// DELETE /api/health-profile
const deleteProfile = asyncHandler(async (req, res) => {
  const deleted = await HealthProfile.findOneAndDelete({ userId: req.user._id });
  if (!deleted) throw new AppError("Health profile not found", 404);
  res.status(200).json({ success: true, message: "Health profile deleted" });
});

module.exports = { getStatus, createProfile, getProfile, updateProfile, deleteProfile };
