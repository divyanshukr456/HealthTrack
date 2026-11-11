const { z } = require("zod");
const { recordDate, nonEmpty, NON_EMPTY_MSG, listQuery } = require("./common");

const METRICS = ["steps", "waterIntake", "weight", "caloriesBurned"];

// null clears a metric (useful in PATCH).
const baseShape = z
  .object({
    date: recordDate,
    steps: z.number().int("Steps must be a whole number").min(0).max(200000).nullable().optional(),
    waterIntake: z.number().min(0).max(20000, "waterIntake is in ml (max 20000)").nullable().optional(),
    weight: z.number().min(2).max(700).nullable().optional(),
    caloriesBurned: z.number().min(0).max(20000).nullable().optional(),
  })
  .strict();

const hasMetric = (d) => METRICS.some((m) => d[m] !== undefined && d[m] !== null);
const METRIC_MSG = { message: `Provide at least one metric: ${METRICS.join(", ")}`, path: ["steps"] };

const createSchema = baseShape.refine(hasMetric, METRIC_MSG);
const updateSchema = baseShape.partial().refine(nonEmpty, NON_EMPTY_MSG);
const listQuerySchema = listQuery();

module.exports = { createSchema, updateSchema, listQuerySchema };
