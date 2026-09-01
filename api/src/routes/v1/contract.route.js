const router = require("express").Router();
const { contract: contractController } = require("../../controller");
const { create, remove, update } = require("../../validation/contract.validation");
const validate = require("../../middleware/validate.middeware");
const auth = require("../../middleware/auth.middleware");

router.route("/").post(auth, validate(create, "body"), contractController.create);
router
  .route("/:id")
  .patch(auth, validate(remove, "params"), validate(update, "body"), contractController.update)
  .delete(auth, validate(remove, "params"), contractController.remove);
router
  .route("/:id/source")
  .get(auth, validate(remove, "params"), contractController.getSource);

module.exports = router;
