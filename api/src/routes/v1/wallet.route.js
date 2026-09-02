const router = require("express").Router();
const { wallet: walletController } = require("../../controller");
const { getWallet, mint } = require("../../validation/wallet.validation");
const validate = require("../../middleware/validate.middleware");
const auth = require("../../middleware/auth.middleware");

router.route("/").get(auth, validate(getWallet, "query"), walletController.getWallet);
router.route("/mint").post(auth, validate(mint, "body"), walletController.mint);

module.exports = router;
