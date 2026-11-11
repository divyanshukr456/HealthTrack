const resourceRouter = require("./resourceRouter");
const controller = require("../controllers/foodController");
const schemas = require("../validators/foodValidator");

module.exports = resourceRouter(controller, schemas);
