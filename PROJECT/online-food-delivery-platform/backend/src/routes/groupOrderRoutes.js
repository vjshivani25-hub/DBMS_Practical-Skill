const express = require("express");

const {
  createGroupOrder,
  joinGroupOrder,
  getGroupOrder,

  addGroupCartItem,
  getGroupCart,

  updateGroupCartItem,
  deleteGroupCartItem,

  getGroupSplitBill,

  initializeGroupPayments,
  demoPayGroupPayment,
} = require("../controllers/groupOrderController");

const router = express.Router();

// ============================================================
// CREATE GROUP
// ============================================================

router.post(
  "/",
  createGroupOrder
);

// ============================================================
// JOIN GROUP
// IMPORTANT: /join MUST COME BEFORE /:groupCode
// ============================================================

router.post(
  "/join",
  joinGroupOrder
);

// ============================================================
// GROUP CART
// ============================================================

router.post(
  "/:groupCode/cart",
  addGroupCartItem
);

router.get(
  "/:groupCode/cart",
  getGroupCart
);

router.patch(
  "/:groupCode/cart/:cartItemId",
  updateGroupCartItem
);

router.delete(
  "/:groupCode/cart/:cartItemId",
  deleteGroupCartItem
);

// ============================================================
// SPLIT BILL
// ============================================================

router.get(
  "/:groupCode/split-bill",
  getGroupSplitBill
);

// ============================================================
// DEMO PAYMENTS
// ============================================================

router.post(
  "/:groupCode/initialize-payments",
  initializeGroupPayments
);

router.post(
  "/:groupCode/payments/:paymentId/demo-pay",
  demoPayGroupPayment
);

// ============================================================
// GET GROUP
// THIS MUST BE LAST
// ============================================================

router.get(
  "/:groupCode",
  getGroupOrder
);

module.exports = router;