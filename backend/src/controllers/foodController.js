const FoodRecord = require("../models/FoodRecord");
const { createSchema } = require("../validators/foodValidator");
const { parseDateOnly, toDateOnly } = require("../utils/dates");
const makeCrudController = require("./crudFactory");

module.exports = makeCrudController({
  Model: FoodRecord,
  label: "Food record",
  fullSchema: createSchema,
  filterKeys: ["mealType"],
  toShape: (o) => ({
    foodName: o.foodName,
    mealType: o.mealType,
    quantity: o.quantity,
    quantityUnit: o.quantityUnit,
    calories: o.calories,
    protein: o.protein ?? null,
    carbs: o.carbs ?? null,
    fat: o.fat ?? null,
    date: toDateOnly(o.date),
  }),
  prepare: (d) => ({
    foodName: d.foodName,
    mealType: d.mealType,
    quantity: d.quantity,
    quantityUnit: d.quantityUnit,
    calories: d.calories,
    protein: d.protein ?? null,
    carbs: d.carbs ?? null,
    fat: d.fat ?? null,
    date: parseDateOnly(d.date),
  }),
});
