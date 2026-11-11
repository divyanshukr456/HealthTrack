const Goal = require("../models/Goal");
const { createSchema } = require("../validators/goalValidator");
const { parseDateOnly, toDateOnly } = require("../utils/dates");
const makeCrudController = require("./crudFactory");

module.exports = makeCrudController({
  Model: Goal,
  label: "Goal",
  fullSchema: createSchema,
  filterKeys: ["status", "goalType"],
  dateField: "deadline", // from/to filter goals by deadline
  toShape: (o) => ({
    goalType: o.goalType,
    targetValue: o.targetValue,
    startValue: o.startValue,
    currentValue: o.currentValue,
    startDate: toDateOnly(o.startDate),
    deadline: toDateOnly(o.deadline),
    status: o.status,
  }),
  prepare: (d) => {
    const startValue = d.startValue ?? 0;
    return {
      goalType: d.goalType,
      targetValue: d.targetValue,
      startValue,
      currentValue: d.currentValue ?? startValue,
      startDate: parseDateOnly(d.startDate || new Date().toISOString().slice(0, 10)),
      deadline: parseDateOnly(d.deadline),
      status: d.status || "active",
    };
  },
});
