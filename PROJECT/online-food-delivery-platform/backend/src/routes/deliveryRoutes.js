const express = require("express");

const {
  getDeliveryPartner,
  getDeliveryDashboard,
  acceptDeliveryOrder,
  updateDeliveryStatus,
} = require("../controllers/deliveryController");

const router = express.Router();

/*
  GET delivery partner profile
*/
router.get(
  "/partner/:partnerId",
  getDeliveryPartner
);

/*
  GET complete delivery dashboard
*/
router.get(
  "/partner/:partnerId/dashboard",
  getDeliveryDashboard
);

/*
  Accept a READY_FOR_PICKUP order
*/
router.post(
  "/partner/:partnerId/orders/:orderId/accept",
  acceptDeliveryOrder
);

/*
  Update:
  READY_FOR_PICKUP -> OUT_FOR_DELIVERY
  OUT_FOR_DELIVERY -> DELIVERED
*/
router.patch(
  "/partner/:partnerId/orders/:orderId/status",
  updateDeliveryStatus
);

module.exports = router;