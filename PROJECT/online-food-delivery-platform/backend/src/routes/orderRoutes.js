const express = require("express");

const {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getRestaurantOrders,
  getRestaurantOrderHistory,
  getRestaurantActiveOrders,
} = require("../controllers/orderController");

const router = express.Router();

// Customer
router.post("/", createOrder);

router.get(
  "/user/:userId",
  getUserOrders
);

// Restaurant
router.get(
  "/restaurant/:restaurantId/history",
  getRestaurantOrderHistory
);

router.get(
  "/restaurant/:restaurantId/active",
  getRestaurantActiveOrders
);

router.get(
  "/restaurant/:restaurantId",
  getRestaurantOrders
);

// Single order
router.get(
  "/:orderId",
  getOrderById
);

// Update status
router.patch(
  "/:orderId/status",
  updateOrderStatus
);

module.exports = router;