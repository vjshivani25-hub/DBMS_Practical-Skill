const express = require("express");
const { restaurantLogin } = require("../controllers/restaurantAuthController");

const router = express.Router();

router.post("/login", restaurantLogin);

module.exports = router;