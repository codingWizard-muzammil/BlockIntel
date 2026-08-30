const router = require("express").Router();
const { contract: contractController } = require("../../controller");
const { create } = require("../../validation/contract.validation");
const validate = require("../../middleware/validate.middeware");
const auth = require("../../middleware/auth.middleware");

router.route("/").post(auth, validate(create, "body"), contractController.create);

module.exports = router;
