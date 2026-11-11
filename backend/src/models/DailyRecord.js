const mongoose = require("mongoose");
const jsonTransform = require("../utils/jsonTransform");

const dailyRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true }, // calendar day, UTC midnight
    steps: { type: Number, min: 0, max: 200000, default: null },
    waterIntake: { type: Number, min: 0, max: 20000, default: null }, // ml
    weight: { type: Number, min: 2, max: 700, default: null }, // kg
    caloriesBurned: { type: Number, min: 0, max: 20000, default: null },
  },
  { timestamps: true }
);

// One summary record per user per day. Also serves date-range queries and sorting.
dailyRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

dailyRecordSchema.set("toJSON", { transform: jsonTransform({ dateFields: ["date"] }) });

module.exports = mongoose.model("DailyRecord", dailyRecordSchema);
