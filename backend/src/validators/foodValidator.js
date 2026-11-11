const { z } = require("zod");
const { recordDate, enumOf, nonEmpty, NON_EMPTY_MSG, listQuery } = require("./common");
const { MEAL_TYPES, QUANTITY_UNITS } = require("../utils/constants");

const macro = (name) => z.number({ invalid_type_error: `${name} must be a number (grams)` }).min(0).max(1000).nullable().optional();

const baseShape = z
  .object({
    foodName: z.string({ required_error: "foodName is required" }).trim().min(1, "foodName is required").max(100),
    mealType: enumOf(MEAL_TYPES, "mealType"),
    quantity: z.number({ required_error: "quantity is required" }).positive("quantity must be greater than 0").max(100000),
    quantityUnit: enumOf(QUANTITY_UNITS, "quantityUnit"),
    calories: z.number({ required_error: "calories is required" }).min(0).max(10000),
    protein: macro("protein"),
    carbs: macro("carbs"),
    fat: macro("fat"),
    date: recordDate,
  })
  .strict();

const createSchema = baseShape;
const updateSchema = baseShape.partial().refine(nonEmpty, NON_EMPTY_MSG);
const listQuerySchema = listQuery({ mealType: enumOf(MEAL_TYPES, "mealType").optional() });

module.exports = { createSchema, updateSchema, listQuerySchema };
