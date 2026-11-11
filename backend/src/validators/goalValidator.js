const { z } = require("zod");
const { parseDateOnly } = require("../utils/dates");
const { dateOnly, enumOf, nonEmpty, NON_EMPTY_MSG, listQuery } = require("./common");
const { GOAL_TYPES, GOAL_STATUSES, WEIGHT_GOAL_TYPES } = require("../utils/constants");

const value = z.number().min(0).max(10000000);

const baseShape = z
  .object({
    goalType: enumOf(GOAL_TYPES, "goalType"),
    targetValue: z.number({ required_error: "targetValue is required" }).positive("targetValue must be greater than 0").max(10000000),
    startValue: value.optional(), // required for weight goals, defaults to 0 for the rest
    currentValue: value.optional(), // defaults to startValue
    startDate: dateOnly.optional(), // defaults to today
    deadline: dateOnly,
    status: enumOf(GOAL_STATUSES, "status").optional(),
  })
  .strict();

const addIssue = (ctx, path, message) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

// Rules run on the FULL goal (create, and the merged result of a PATCH).
const createSchema = baseShape.superRefine((d, ctx) => {
  const isWeight = WEIGHT_GOAL_TYPES.includes(d.goalType);

  if (isWeight && d.startValue === undefined) {
    addIssue(ctx, "startValue", "startValue (your starting weight in kg) is required for weight goals");
  }
  if (isWeight) {
    [["targetValue", d.targetValue], ["startValue", d.startValue], ["currentValue", d.currentValue]].forEach(([k, v]) => {
      if (v !== undefined && (v < 2 || v > 700)) addIssue(ctx, k, "Weight must be between 2 and 700 kg");
    });
  }
  if (d.startValue !== undefined) {
    if (d.goalType === "weight_loss" && d.targetValue >= d.startValue) {
      addIssue(ctx, "targetValue", "For weight_loss, targetValue must be lower than startValue");
    } else if (d.goalType !== "weight_loss" && d.targetValue <= d.startValue) {
      addIssue(ctx, "targetValue", "targetValue must be greater than startValue");
    }
  }
  const start = d.startDate || new Date().toISOString().slice(0, 10);
  if (d.deadline && parseDateOnly(d.deadline) < parseDateOnly(start)) {
    addIssue(ctx, "deadline", "Deadline cannot be before the start date");
  }
});

// goalType, startValue and startDate cannot change after creation. Create a new goal instead.
const updateSchema = baseShape
  .pick({ targetValue: true, currentValue: true, deadline: true, status: true })
  .partial()
  .refine(nonEmpty, NON_EMPTY_MSG);

const listQuerySchema = listQuery({
  status: enumOf(GOAL_STATUSES, "status").optional(),
  goalType: enumOf(GOAL_TYPES, "goalType").optional(),
});

module.exports = { createSchema, updateSchema, listQuerySchema };
