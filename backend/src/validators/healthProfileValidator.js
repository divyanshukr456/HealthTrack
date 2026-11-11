const { z } = require("zod");
const { GENDERS, YES_NO_UNSURE, ACTIVITY_LEVELS, ALLERGY_TYPES } = require("../utils/constants");

const yesNoUnsure = z.enum(YES_NO_UNSURE).nullable(); // null = not answered

const dedupe = (arr) => {
  const seen = new Set();
  return arr.filter((v) => {
    const key = v.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const allergyItem = z
  .object({
    name: z.string().trim().min(1, "Allergy name is required").max(100),
    type: z.enum(ALLERGY_TYPES, { errorMap: () => ({ message: `Allergy type must be one of: ${ALLERGY_TYPES.join(", ")}` }) }),
  })
  .strict();

// .strict() rejects unknown keys, so a client-supplied userId is an error, never used.
const baseShape = z
  .object({
    gender: z.enum(GENDERS, { errorMap: () => ({ message: `Gender must be one of: ${GENDERS.join(", ")}` }) }),
    height: z.number({ invalid_type_error: "Height must be a number (cm)" }).min(50, "Height must be at least 50 cm").max(272, "Height must be at most 272 cm"),
    weight: z.number({ invalid_type_error: "Weight must be a number (kg)" }).min(2, "Weight must be at least 2 kg").max(700, "Weight must be at most 700 kg"),
    activityLevel: z.enum(ACTIVITY_LEVELS, { errorMap: () => ({ message: `Activity level must be one of: ${ACTIVITY_LEVELS.join(", ")}` }) }),
    medicalStatus: yesNoUnsure.optional(),
    medicalConditions: z.array(z.string().trim().min(1).max(100)).max(20, "At most 20 medical conditions").transform(dedupe).optional(),
    allergies: z
      .object({
        hasAllergies: yesNoUnsure.optional(),
        items: z.array(allergyItem).max(30, "At most 30 allergies").optional(),
      })
      .strict()
      .optional(),
    consent: z.object({ medicalDataConsent: z.boolean() }).strict().optional(),
  })
  .strict();

// Cross-field rules, applied to the FULL profile (create, and the merged result of a PATCH).
const checkRules = (data, ctx) => {
  const conditions = data.medicalConditions || [];
  const items = (data.allergies && data.allergies.items) || [];
  const hasAllergies = data.allergies ? data.allergies.hasAllergies : undefined;

  const hasMedicalInfo =
    (data.medicalStatus !== undefined && data.medicalStatus !== null) ||
    conditions.length > 0 ||
    (hasAllergies !== undefined && hasAllergies !== null) ||
    items.length > 0;

  if (hasMedicalInfo && !(data.consent && data.consent.medicalDataConsent === true)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["consent", "medicalDataConsent"],
      message: "Consent is required to store medical or allergy information",
    });
  }
  if (conditions.length > 0 && data.medicalStatus !== "yes") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["medicalConditions"],
      message: "medicalConditions can only be provided when medicalStatus is 'yes'",
    });
  }
  if (items.length > 0 && hasAllergies !== "yes") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["allergies", "items"],
      message: "allergies.items can only be provided when allergies.hasAllergies is 'yes'",
    });
  }
};

const createHealthProfileSchema = baseShape.superRefine(checkRules);

// PATCH: every field optional, at least one required. Rules are re-checked on the merged profile.
const updateHealthProfileSchema = baseShape
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

module.exports = { createHealthProfileSchema, updateHealthProfileSchema };
