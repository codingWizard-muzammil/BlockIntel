const router = require("express").Router();
const { contract: contractController } = require("../../controller");
const { create, remove } = require("../../validation/contract.validation");
const validate = require("../../middleware/validate.middeware");
const auth = require("../../middleware/auth.middleware");

router.route("/").post(auth, validate(create, "body"), contractController.create);
router
  .route("/:id")
  .delete(auth, validate(remove, "params"), contractController.remove);

module.exports = router;
