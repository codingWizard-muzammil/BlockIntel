const router = require("express").Router();
const { project: projectController } = require("../../controller");
const { create, remove } = require("../../validation/project.validation");
const validate = require("../../middleware/validate.middleware");
const auth = require("../../middleware/auth.middleware");

router.route("/").get(auth, projectController.list);
router.route("/").post(auth, validate(create, "body"), projectController.create);
router
  .route("/:id")
  .get(auth, validate(remove, "params"), projectController.getOne)
  .delete(auth, validate(remove, "params"), projectController.remove);

module.exports = router;
