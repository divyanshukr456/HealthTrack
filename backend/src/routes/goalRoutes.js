const resourceRouter = require("./resourceRouter");
const controller = require("../controllers/goalController");
const schemas = require("../validators/goalValidator");

module.exports = resourceRouter(controller, schemas);
