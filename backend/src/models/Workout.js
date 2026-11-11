const mongoose = require("mongoose");
const jsonTransform = require("../utils/jsonTransform");
const { WORKOUT_CATEGORIES } = require("../utils/constants");

const workoutSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    exerciseName: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, enum: WORKOUT_CATEGORIES, required: true },
    duration: { type: Number, required: true, min: 1, max: 1440 }, // minutes
    caloriesBurned: { type: Number, min: 0, max: 20000, default: null },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

workoutSchema.index({ userId: 1, date: -1 });

workoutSchema.set("toJSON", { transform: jsonTransform({ dateFields: ["date"] }) });

module.exports = mongoose.model("Workout", workoutSchema);
