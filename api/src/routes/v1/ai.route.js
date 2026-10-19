const router = require("express").Router();
const { ai: aiController } = require("../../controller");
const { write } = require("../../validation/ai.validation");
const validate = require("../../middleware/validate.middleware");
const auth = require("../../middleware/auth.middleware");

router.route("/write").post(auth, validate(write, "body"), aiController.write);

module.exports = router;
