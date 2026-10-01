const express = require("express");

const {
  getAllMenuItems,
  getMenuByRestaurant,
  getMenuItemById,
} = require("../controllers/menuController");

const router = express.Router();

// GET /api/menu
router.get("/", getAllMenuItems);

// GET /api/menu/restaurant/1
router.get("/restaurant/:restaurantId", getMenuByRestaurant);

// GET /api/menu/item/1
router.get("/item/:id", getMenuItemById);

module.exports = router;