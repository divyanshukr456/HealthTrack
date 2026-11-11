const AppError = require("../utils/AppError");

// Rejects anything that is not a 24-character hex ObjectId before it reaches MongoDB.
module.exports = (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return next(new AppError("Invalid id", 400));
  next();
};
