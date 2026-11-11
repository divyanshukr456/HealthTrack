class AppError extends Error {
  constructor(message, statusCode = 500, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (errors) this.errors = errors; // [{ field, message }] for validation errors
  }
}

module.exports = AppError;
