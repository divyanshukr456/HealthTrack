const mongoose = require("mongoose");
const { GENDERS, YES_NO_UNSURE, ACTIVITY_LEVELS, ALLERGY_TYPES } = require("../utils/constants");

const allergyItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, enum: ALLERGY_TYPES, required: true },
  },
  { _id: false }
);

const healthProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one health profile per user
    },
    gender: { type: String, enum: GENDERS, required: true },
    height: { type: Number, required: true, min: 50, max: 272 }, // cm
    weight: { type: Number, required: true, min: 2, max: 700 }, // kg
    activityLevel: { type: String, enum: ACTIVITY_LEVELS, required: true },

    // null = not answered. "unsure" = user answered "I don't know".
    medicalStatus: { type: String, enum: YES_NO_UNSURE, default: null },
    medicalConditions: { type: [{ type: String, trim: true, maxlength: 100 }], default: [] },
    allergies: {
      hasAllergies: { type: String, enum: YES_NO_UNSURE, default: null },
      items: { type: [allergyItemSchema], default: [] },
    },

    consent: {
      medicalDataConsent: { type: Boolean, default: false },
      consentedAt: { type: Date, default: null },
      consentVersion: { type: String, default: null },
    },

    completedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

healthProfileSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("HealthProfile", healthProfileSchema);
