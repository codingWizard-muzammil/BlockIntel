const router = require("express").Router();
const { auth: authController } = require("../../controller");
const { nonce, verify } = require("../../validation/auth.validation");
const validate = require("../../middleware/validate.middeware");

router.route("/nonce").get(validate(nonce, "query"), authController.nonce);
router.route("/verify").get(validate(verify, "query"), authController.verifyNonce);

module.exports = router;
