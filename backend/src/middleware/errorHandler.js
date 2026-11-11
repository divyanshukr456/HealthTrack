const env = require("../config/env");
const AppError = require("../utils/AppError");

const notFound = (req, res, next) => {
  next(new AppError("Route not found", 404));
};

// Four parameters are required for Express to treat this as an error handler.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message;

  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body";
  } else if (err.code === 11000) {
    // Duplicate key (unique index), e.g. two simultaneous requests
    statusCode = 409;
    if (err.keyPattern && err.keyPattern.email) message = "Email is already registered";
    else if (err.keyPattern && err.keyPattern.date) message = "A daily record for this date already exists. Use PATCH to update it";
    else if (err.keyPattern && err.keyPattern.userId) message = "Health profile already exists";
    else message = "Duplicate value";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid id or value";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  } else if (!err.isOperational) {
    statusCode = 500;
    message = "Internal server error"; // never leak internals
  }

  if (statusCode === 500 && env.NODE_ENV === "development") console.error(err);

  const body = { success: false, message };
  if (err.isOperational && err.errors) body.errors = err.errors;
  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
