const express = require("express");

const {
  getDeliveryPartner,
  getDeliveryPartnerByUser,
  getDeliveryDashboard,
  getDeliveryOrders,
  pickupOrder,
  deliverOrder,
  updateAvailability,
} = require("../controllers/deliveryPartnerController");

const router = express.Router();

// --------------------------------------------------
// USER -> DELIVERY PARTNER
// --------------------------------------------------

router.get(
  "/user/:userId",
  getDeliveryPartnerByUser
);

// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

router.get(
  "/:partnerId/dashboard",
  getDeliveryDashboard
);

// --------------------------------------------------
// ORDER ACTIONS
// --------------------------------------------------

router.patch(
  "/orders/:orderId/pickup",
  pickupOrder
);

router.patch(
  "/orders/:orderId/deliver",
  deliverOrder
);

// --------------------------------------------------
// PARTNER ORDERS
// --------------------------------------------------

router.get(
  "/:partnerId/orders",
  getDeliveryOrders
);

// --------------------------------------------------
// AVAILABILITY
// --------------------------------------------------

router.patch(
  "/:partnerId/availability",
  updateAvailability
);

// --------------------------------------------------
// PARTNER PROFILE
// --------------------------------------------------

router.get(
  "/:partnerId",
  getDeliveryPartner
);

module.exports = router;