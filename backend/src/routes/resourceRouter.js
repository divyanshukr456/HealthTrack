const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const validateQuery = require("../middleware/validateQuery");
const validateObjectId = require("../middleware/validateObjectId");

// Standard CRUD routes. protect runs first, so every endpoint requires login.
module.exports = (controller, { createSchema, updateSchema, listQuerySchema }) => {
  const router = express.Router();
  router.use(protect);

  router
    .route("/")
    .post(validate(createSchema), controller.create)
    .get(validateQuery(listQuerySchema), controller.list);

  router
    .route("/:id")
    .all(validateObjectId)
    .get(controller.getOne)
    .patch(validate(updateSchema), controller.update)
    .delete(controller.remove);

  return router;
};
