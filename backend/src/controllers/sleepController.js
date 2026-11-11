const SleepRecord = require("../models/SleepRecord");
const { createSchema } = require("../validators/sleepValidator");
const { parseDateOnly, toDateOnly } = require("../utils/dates");
const makeCrudController = require("./crudFactory");

module.exports = makeCrudController({
  Model: SleepRecord,
  label: "Sleep record",
  fullSchema: createSchema,
  toShape: (o) => ({
    sleepTime: o.sleepTime.toISOString(),
    wakeTime: o.wakeTime.toISOString(),
    date: toDateOnly(o.date),
  }),
  // If wakeTime changes and no date is sent, the date is re-derived from the new wakeTime.
  mergePatch: (shape, patch) => {
    const merged = { ...shape, ...patch };
    if (patch.wakeTime !== undefined && patch.date === undefined) delete merged.date;
    return merged;
  },
  // durationMinutes is calculated in the model (pre-validate hook), never taken from the client.
  prepare: (d) => ({
    sleepTime: new Date(d.sleepTime),
    wakeTime: new Date(d.wakeTime),
    date: parseDateOnly(d.date || d.wakeTime.slice(0, 10)), // date part of wakeTime, in the client's own offset
  }),
});
