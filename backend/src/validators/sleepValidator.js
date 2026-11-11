const { z } = require("zod");
const { DAY_MS } = require("../utils/dates");
const { recordDate, nonEmpty, NON_EMPTY_MSG, listQuery } = require("./common");

const isoTime = z
  .string({ required_error: "Time is required" })
  .datetime({ offset: true, message: "Must be an ISO date-time, e.g. 2026-11-09T23:30:00+05:30" });

// durationMinutes is NOT accepted (.strict()): the server calculates it.
const baseShape = z
  .object({
    sleepTime: isoTime,
    wakeTime: isoTime,
    date: recordDate.optional(), // defaults to the date part of wakeTime
  })
  .strict();

const createSchema = baseShape.superRefine((d, ctx) => {
  const sleep = Date.parse(d.sleepTime);
  const wake = Date.parse(d.wakeTime);
  if (wake <= sleep) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["wakeTime"], message: "wakeTime must be after sleepTime" });
  } else if (wake - sleep > DAY_MS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["wakeTime"], message: "Sleep duration cannot exceed 24 hours" });
  }
  if (wake > Date.now() + DAY_MS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["wakeTime"], message: "wakeTime cannot be in the future" });
  }
});
const updateSchema = baseShape.partial().refine(nonEmpty, NON_EMPTY_MSG);
const listQuerySchema = listQuery();

module.exports = { createSchema, updateSchema, listQuerySchema };
