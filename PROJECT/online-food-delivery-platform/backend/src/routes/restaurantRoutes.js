const express = require("express");

const {
  getRestaurants,
  getRestaurantById,
} = require("../controllers/restaurantController");

const router = express.Router();

// Get all restaurants
// GET /api/restaurants
router.get("/", getRestaurants);

// Get restaurant by ID
// GET /api/restaurants/:id
router.get("/:id", getRestaurantById);

module.exports = router;