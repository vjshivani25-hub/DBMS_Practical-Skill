const express = require("express");

const {
  getUserAddresses,
  createAddress,
} = require("../controllers/addressController");

const router = express.Router();

// Get all addresses of a user
router.get(
  "/user/:userId",
  getUserAddresses
);

// Create a new address
router.post(
  "/",
  createAddress
);

module.exports = router;