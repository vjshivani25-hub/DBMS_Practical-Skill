const API_BASE_URL = "http://localhost:5000/api";

// ============================================================
// RESTAURANTS
// ============================================================

export async function getRestaurants() {
  const response = await fetch(
    `${API_BASE_URL}/restaurants`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch restaurants");
  }

  return response.json();
}


export async function getRestaurantById(id) {
  const response = await fetch(
    `${API_BASE_URL}/restaurants/${id}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch restaurant");
  }

  return response.json();
}


// ============================================================
// MENU
// ============================================================

export async function getRestaurantMenu(restaurantId) {
  const response = await fetch(
    `${API_BASE_URL}/menu/restaurant/${restaurantId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch restaurant menu");
  }

  return response.json();
}


export async function getAllMenuItems() {
  const response = await fetch(
    `${API_BASE_URL}/menu`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch menu");
  }

  return response.json();
}


// ============================================================
// AUTHENTICATION
// ============================================================

export async function registerUser(userData) {
  const response = await fetch(
    `${API_BASE_URL}/auth/register`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(userData),
    }
  );

  return response.json();
}


export async function loginUser(credentials) {
  const response = await fetch(
    `${API_BASE_URL}/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(credentials),
    }
  );

  return response.json();
}


// ============================================================
// ADDRESSES
// ============================================================

export async function getUserAddresses(userId) {
  const response = await fetch(
    `${API_BASE_URL}/addresses/user/${userId}`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch user addresses"
    );
  }

  return response.json();
}


export async function createAddress(addressData) {
  const response = await fetch(
    `${API_BASE_URL}/addresses`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(addressData),
    }
  );

  return response.json();
}


// ============================================================
// CUSTOMER ORDERS
// ============================================================

export async function createOrder(orderData) {
  const response = await fetch(
    `${API_BASE_URL}/orders`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(orderData),
    }
  );

  return response.json();
}


export async function getUserOrders(userId) {
  const response = await fetch(
    `${API_BASE_URL}/orders/user/${userId}`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch user orders"
    );
  }

  return response.json();
}


export async function getOrderById(orderId) {
  const response = await fetch(
    `${API_BASE_URL}/orders/${orderId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch order");
  }

  return response.json();
}


// ============================================================
// ORDER STATUS UPDATE
// ============================================================
//
// Possible statuses:
//
// PLACED
// CONFIRMED
// PREPARING
// READY_FOR_PICKUP
// OUT_FOR_DELIVERY
// DELIVERED
// CANCELLED
//

export async function updateOrderStatus(
  orderId,
  status
) {
  const response = await fetch(
    `${API_BASE_URL}/orders/${orderId}/status`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        status,
      }),
    }
  );

  return response.json();
}


// ============================================================
// RESTAURANT ORDERS
// ============================================================

export async function getRestaurantOrders(
  restaurantId
) {
  const response = await fetch(
    `${API_BASE_URL}/orders/restaurant/${restaurantId}`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch restaurant orders"
    );
  }

  return response.json();
}


// ============================================================
// RESTAURANT ACTIVE ORDERS
// ============================================================

export async function getRestaurantActiveOrders(
  restaurantId
) {
  const response = await fetch(
    `${API_BASE_URL}/orders/restaurant/${restaurantId}/active`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch active restaurant orders"
    );
  }

  return response.json();
}


// ============================================================
// RESTAURANT ORDER HISTORY
// ============================================================

export async function getRestaurantOrderHistory(
  restaurantId
) {
  const response = await fetch(
    `${API_BASE_URL}/orders/restaurant/${restaurantId}/history`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch restaurant order history"
    );
  }

  return response.json();
}


// ============================================================
// DELIVERY PARTNER
// ============================================================

export async function getDeliveryPartner(
  partnerId
) {
  const response = await fetch(
    `${API_BASE_URL}/delivery-partners/${partnerId}`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch delivery partner"
    );
  }

  return response.json();
}


// ============================================================
// DELIVERY DASHBOARD
// ============================================================

export async function getDeliveryDashboard(
  partnerId
) {
  const response = await fetch(
    `${API_BASE_URL}/delivery-partners/${partnerId}/dashboard`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch delivery dashboard"
    );
  }

  return response.json();
}


// ============================================================
// DELIVERY ORDERS
// ============================================================

export async function getDeliveryOrders(
  partnerId
) {
  const response = await fetch(
    `${API_BASE_URL}/delivery-partners/${partnerId}/orders`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch delivery orders"
    );
  }

  return response.json();
}


// ============================================================
// PICKUP / ACCEPT DELIVERY
// ============================================================
//
// READY_FOR_PICKUP
//        ↓
// OUT_FOR_DELIVERY
//

export async function pickupDeliveryOrder(
  orderId,
  partnerId
) {
  const response = await fetch(
    `${API_BASE_URL}/delivery-partners/orders/${orderId}/pickup`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        partnerId,
      }),
    }
  );

  return response.json();
}


// ============================================================
// DELIVER ORDER
// ============================================================
//
// OUT_FOR_DELIVERY
//        ↓
// DELIVERED
//

export async function deliverDeliveryOrder(
  orderId,
  partnerId
) {
  const response = await fetch(
    `${API_BASE_URL}/delivery-partners/orders/${orderId}/deliver`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        partnerId,
      }),
    }
  );

  return response.json();
}


// ============================================================
// DELIVERY PARTNER AVAILABILITY
// ============================================================
//
// AVAILABLE
// BUSY
// OFFLINE
//

export async function updateDeliveryAvailability(
  partnerId,
  availability_status
) {
  const response = await fetch(
    `${API_BASE_URL}/delivery-partners/${partnerId}/availability`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        availability_status,
      }),
    }
  );

  return response.json();
}


// ============================================================
// ============================================================
// GROUP ORDERING
// ============================================================
// ============================================================


// ============================================================
// CREATE GROUP ORDER
// ============================================================
//
// POST /api/group-orders
//
// Body:
// {
//   userId,
//   restaurantId
// }
//

export async function createGroupOrder(
  userId,
  restaurantId
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        userId,
        restaurantId,
      }),
    }
  );

  return response.json();
}


// ============================================================
// JOIN GROUP ORDER
// ============================================================
//
// POST /api/group-orders/join
//
// Body:
// {
//   groupCode,
//   userId
// }
//

export async function joinGroupOrder(
  groupCode,
  userId
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders/join`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        groupCode,
        userId,
      }),
    }
  );

  // IMPORTANT:
  // Preserve backend error message/status.
  // This helps the Group Order UI show
  // messages like "Group is locked" etc.

  const data = await response.json();

  if (!response.ok) {
    return {
      ...data,
      success: false,
      status: response.status,
    };
  }

  return data;
}


// ============================================================
// GET GROUP ORDER
// ============================================================
//
// GET /api/group-orders/:groupCode
//

export async function getGroupOrder(
  groupCode
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders/${groupCode}`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch group order"
    );
  }

  return response.json();
}


// ============================================================
// ADD GROUP CART ITEM
// ============================================================
//
// POST /api/group-orders/:groupCode/cart
//
// Body:
// {
//   userId,
//   itemId,
//   quantity
// }

export async function addGroupCartItem(
  groupCode,
  userId,
  itemId,
  quantity = 1
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders/${groupCode}/cart`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        userId,
        itemId,
        quantity,
      }),
    }
  );

  // Preserve backend error.
  // Example:
  // Group locked after payment.

  const data = await response.json();

  if (!response.ok) {
    return {
      ...data,
      success: false,
      status: response.status,
    };
  }

  return data;
}


// ============================================================
// GET GROUP CART
// ============================================================
//
// GET /api/group-orders/:groupCode/cart
//

export async function getGroupCart(
  groupCode
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders/${groupCode}/cart`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch group cart"
    );
  }

  return response.json();
}


// ============================================================
// UPDATE GROUP CART ITEM
// ============================================================
//
// PATCH /api/group-orders/:groupCode/cart/:cartItemId
//
// Body:
// {
//   userId,
//   quantity
// }

export async function updateGroupCartItem(
  groupCode,
  cartItemId,
  userId,
  quantity
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders/${groupCode}/cart/${cartItemId}`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        userId,
        quantity,
      }),
    }
  );

  return response.json();
}


// ============================================================
// DELETE GROUP CART ITEM
// ============================================================
//
// DELETE /api/group-orders/:groupCode/cart/:cartItemId
//
// Body:
// {
//   userId
// }

export async function deleteGroupCartItem(
  groupCode,
  cartItemId,
  userId
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders/${groupCode}/cart/${cartItemId}`,
    {
      method: "DELETE",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        userId,
      }),
    }
  );

  return response.json();
}


// ============================================================
// GET GROUP SPLIT BILL
// ============================================================
//
// GET /api/group-orders/:groupCode/split-bill
//
// Returns:
// - Members
// - Items selected by each member
// - Individual subtotal
// - Group total
// - Payment information
//

export async function getGroupSplitBill(
  groupCode
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders/${groupCode}/split-bill`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch group split bill"
    );
  }

  return response.json();
}


// ============================================================
// INITIALIZE GROUP PAYMENTS
// ============================================================
//
// POST /api/group-orders/:groupCode/initialize-payments
//
// Creates:
//
// User 1 → PENDING ₹249
// User 2 → PENDING ₹329
//
// OPEN → CHECKOUT
//
// DEMO PAYMENT ONLY.
// NO RAZORPAY.
// NO REAL MONEY.
//

export async function initializeGroupPayments(
  groupCode
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders/${groupCode}/initialize-payments`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.json();
}


// ============================================================
// GET GROUP PAYMENT STATUS
// ============================================================
//
// IMPORTANT:
//
// DO NOT call initialize-payments here.
//
// initialize-payments CREATES payment rows.
//
// This function only gets the existing split bill/payment
// information.
//

export async function getGroupPayments(
  groupCode
) {
  return getGroupSplitBill(groupCode);
}


// ============================================================
// DEMO GROUP PAYMENT
// ============================================================
//
// POST:
//
// /api/group-orders/:groupCode/payments/:paymentId/demo-pay
//
// Example:
//
// groupCode = FGBBNL
// paymentId = 1
//
// Marks payment as:
//
// PENDING → PAID
//
// When all members pay:
//
// CHECKOUT → PLACED
//
// NO RAZORPAY.
// NO REAL MONEY.
// NO PAN.
// NO KYC.
//

export async function demoPayGroupPayment(
  groupCode,
  paymentId
) {
  const response = await fetch(
    `${API_BASE_URL}/group-orders/${groupCode}/payments/${paymentId}/demo-pay`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.json();
}


// ============================================================
// DEMO PAYMENT STATUS HELPER
// ============================================================

export async function payGroupMemberShare(
  groupCode,
  paymentId
) {
  return demoPayGroupPayment(
    groupCode,
    paymentId
  );
}


// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================
//
// If any existing frontend code uses:
//
// createGroupPaymentOrder()
//
// it will still work using DEMO PAYMENT.
//

export async function createGroupPaymentOrder(
  groupCode,
  paymentId
) {
  return demoPayGroupPayment(
    groupCode,
    paymentId
  );
}