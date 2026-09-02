const router = require("express").Router();
const { contract: contractController } = require("../../controller");
const { create, remove, update, call } = require("../../validation/contract.validation");
const validate = require("../../middleware/validate.middleware");
const auth = require("../../middleware/auth.middleware");

router.route("/").post(auth, validate(create, "body"), contractController.create);
router
  .route("/:id")
  .patch(auth, validate(remove, "params"), validate(update, "body"), contractController.update)
  .delete(auth, validate(remove, "params"), contractController.remove);
router
  .route("/:id/source")
  .get(auth, validate(remove, "params"), contractController.getSource);
router
  .route("/:id/compile")
  .post(auth, validate(remove, "params"), contractController.compileAndDeploy);
router
  .route("/:id/call")
  .post(auth, validate(remove, "params"), validate(call, "body"), contractController.callFunction);
router
  .route("/:id/wallet")
  .get(auth, validate(remove, "params"), contractController.getWallet);

module.exports = router;
