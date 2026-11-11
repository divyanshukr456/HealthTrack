const AppError = require("../utils/AppError");

// Validates req.query with Zod; the cleaned values are available as req.validatedQuery.
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return next(
      new AppError(
        "Invalid query parameters",
        400,
        result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
      )
    );
  }
  req.validatedQuery = result.data;
  next();
};

module.exports = validateQuery;
