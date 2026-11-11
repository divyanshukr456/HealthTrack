const resourceRouter = require("./resourceRouter");
const controller = require("../controllers/workoutController");
const schemas = require("../validators/workoutValidator");

module.exports = resourceRouter(controller, schemas);
