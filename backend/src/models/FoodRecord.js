const mongoose = require("mongoose");
const jsonTransform = require("../utils/jsonTransform");
const { MEAL_TYPES, QUANTITY_UNITS } = require("../utils/constants");

const foodSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    foodName: { type: String, required: true, trim: true, maxlength: 100 },
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    quantity: { type: Number, required: true, min: 0.01, max: 100000 },
    quantityUnit: { type: String, enum: QUANTITY_UNITS, required: true },
    calories: { type: Number, required: true, min: 0, max: 10000 },
    // null = macro not entered (different from 0 g)
    protein: { type: Number, min: 0, max: 1000, default: null },
    carbs: { type: Number, min: 0, max: 1000, default: null },
    fat: { type: Number, min: 0, max: 1000, default: null },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

foodSchema.index({ userId: 1, date: -1 });

foodSchema.set("toJSON", { transform: jsonTransform({ dateFields: ["date"] }) });

module.exports = mongoose.model("FoodRecord", foodSchema);
