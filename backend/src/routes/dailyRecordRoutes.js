const resourceRouter = require("./resourceRouter");
const controller = require("../controllers/dailyRecordController");
const schemas = require("../validators/dailyRecordValidator");

module.exports = resourceRouter(controller, schemas);
