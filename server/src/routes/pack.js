const express = require("express");
const router = express.Router();
const { getPacks, getPackById, createPack, updatePack, deletePack } = require("../controllers/packController");
const { admin } = require("../middlewares/auth");

router.get("/", getPacks);
router.get("/:id", getPackById);
router.post("/", ...admin, createPack);
router.put("/:id", ...admin, updatePack);
router.delete("/:id", ...admin, deletePack);

module.exports = router;
