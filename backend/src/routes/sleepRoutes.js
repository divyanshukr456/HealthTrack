const resourceRouter = require("./resourceRouter");
const controller = require("../controllers/sleepController");
const schemas = require("../validators/sleepValidator");

module.exports = resourceRouter(controller, schemas);
