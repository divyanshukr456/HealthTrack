const { z } = require("zod");
const { DAY_MS, parseDateOnly, isRealDate, todayUTC } = require("../utils/dates");

const dateOnly = z
  .string({ invalid_type_error: "Date must be a string in YYYY-MM-DD format" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(isRealDate, "Date is not a valid date");

// Records can't be in the future (one day of slack covers timezones ahead of UTC, like India).
const recordDate = dateOnly.refine(
  (s) => parseDateOnly(s).getTime() <= todayUTC().getTime() + DAY_MS,
  "Date cannot be in the future"
);

const enumOf = (values, label) =>
  z.enum(values, { errorMap: () => ({ message: `${label} must be one of: ${values.join(", ")}` }) });

const nonEmpty = (d) => Object.keys(d).length > 0;
const NON_EMPTY_MSG = { message: "Provide at least one field to update" };

// Query for list endpoints: pagination + date range + sort order (+ resource filters).
const listQuery = (extra = {}) =>
  z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      from: dateOnly.optional(),
      to: dateOnly.optional(),
      order: z.enum(["asc", "desc"]).default("desc"),
      ...extra,
    })
    .strict()
    .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "'from' must be on or before 'to'", path: ["from"] });

module.exports = { dateOnly, recordDate, enumOf, nonEmpty, NON_EMPTY_MSG, listQuery };
