const DailyRecord = require("../models/DailyRecord");
const { createSchema } = require("../validators/dailyRecordValidator");
const { parseDateOnly, toDateOnly } = require("../utils/dates");
const makeCrudController = require("./crudFactory");

module.exports = makeCrudController({
  Model: DailyRecord,
  label: "Daily record",
  fullSchema: createSchema,
  toShape: (o) => ({
    date: toDateOnly(o.date),
    steps: o.steps ?? null,
    waterIntake: o.waterIntake ?? null,
    weight: o.weight ?? null,
    caloriesBurned: o.caloriesBurned ?? null,
  }),
  prepare: (d) => ({
    date: parseDateOnly(d.date),
    steps: d.steps ?? null,
    waterIntake: d.waterIntake ?? null,
    weight: d.weight ?? null,
    caloriesBurned: d.caloriesBurned ?? null,
  }),
});
