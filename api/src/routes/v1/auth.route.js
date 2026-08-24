const router = require("express").Router();
const { auth: authController } = require("../../controller");
const { nonce, verify } = require("../../validation/auth.validation");
const validate = require("../../middleware/validate.middeware");
const auth = require("../../middleware/auth.middleware");

router.route("/nonce").get(validate(nonce, "query"), authController.nonce);
router.route("/verify").post(validate(verify, "body"), authController.verifyNonce);
router.route("/me").get(auth, authController.me);

module.exports = router;
