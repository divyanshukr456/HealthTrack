const Workout = require("../models/Workout");
const { createSchema } = require("../validators/workoutValidator");
const { parseDateOnly, toDateOnly } = require("../utils/dates");
const makeCrudController = require("./crudFactory");

module.exports = makeCrudController({
  Model: Workout,
  label: "Workout",
  fullSchema: createSchema,
  filterKeys: ["category"],
  toShape: (o) => ({
    exerciseName: o.exerciseName,
    category: o.category,
    duration: o.duration,
    caloriesBurned: o.caloriesBurned ?? null,
    date: toDateOnly(o.date),
  }),
  prepare: (d) => ({
    exerciseName: d.exerciseName,
    category: d.category,
    duration: d.duration,
    caloriesBurned: d.caloriesBurned ?? null,
    date: parseDateOnly(d.date),
  }),
});
