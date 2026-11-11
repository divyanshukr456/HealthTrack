const { z } = require("zod");
const { recordDate, enumOf, nonEmpty, NON_EMPTY_MSG, listQuery } = require("./common");
const { WORKOUT_CATEGORIES } = require("../utils/constants");

const baseShape = z
  .object({
    exerciseName: z.string({ required_error: "exerciseName is required" }).trim().min(1, "exerciseName is required").max(100),
    category: enumOf(WORKOUT_CATEGORIES, "category"),
    duration: z.number({ required_error: "duration is required" }).int("duration must be whole minutes").min(1).max(1440),
    caloriesBurned: z.number().min(0).max(20000).nullable().optional(),
    date: recordDate,
  })
  .strict();

const createSchema = baseShape;
const updateSchema = baseShape.partial().refine(nonEmpty, NON_EMPTY_MSG);
const listQuerySchema = listQuery({ category: enumOf(WORKOUT_CATEGORIES, "category").optional() });

module.exports = { createSchema, updateSchema, listQuerySchema };
