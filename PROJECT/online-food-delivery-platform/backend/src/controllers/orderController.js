const db = require("../config/db");

// ============================================================
// CREATE ORDER
// ============================================================

const createOrder = async (req, res) => {
  let connection;

  try {
    const {
      user_id,
      restaurant_id,
      address_id,
      items,
    } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !user_id ||
      !restaurant_id ||
      !address_id ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "user_id, restaurant_id, address_id and items are required",
      });
    }

    // --------------------------------------------------------
    // DATABASE CONNECTION
    // --------------------------------------------------------

    connection = await db.getConnection();

    await connection.beginTransaction();

    // --------------------------------------------------------
    // CHECK USER
    // --------------------------------------------------------

    const [users] = await connection.query(
      `
      SELECT
        user_id,
        name,
        email,
        role
      FROM users
      WHERE user_id = ?
      LIMIT 1
      `,
      [user_id]
    );

    if (users.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // --------------------------------------------------------
    // CHECK RESTAURANT
    // --------------------------------------------------------

    const [restaurants] = await connection.query(
      `
      SELECT
        restaurant_id,
        name,
        delivery_fee,
        is_open
      FROM restaurants
      WHERE restaurant_id = ?
      LIMIT 1
      `,
      [restaurant_id]
    );

    if (restaurants.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const restaurant = restaurants[0];

    // --------------------------------------------------------
    // DELIVERY FEE
    // --------------------------------------------------------

    const deliveryFee = Number(
      restaurant.delivery_fee || 0
    );

    // --------------------------------------------------------
    // CHECK ADDRESS
    // --------------------------------------------------------

    const [addresses] = await connection.query(
      `
      SELECT
        address_id,
        user_id,
        address_line,
        city,
        state,
        pincode
      FROM addresses
      WHERE address_id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [address_id, user_id]
    );

    if (addresses.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Delivery address not found for this user",
      });
    }

    // --------------------------------------------------------
    // EXTRACT ITEM IDS
    // --------------------------------------------------------

    const itemIds = items.map((item) =>
      Number(item.item_id)
    );

    if (
      itemIds.some(
        (id) =>
          !Number.isInteger(id) ||
          id <= 0
      )
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    // --------------------------------------------------------
    // PREVENT DUPLICATE ITEM IDS
    // --------------------------------------------------------

    const uniqueItemIds = [
      ...new Set(itemIds),
    ];

    if (
      uniqueItemIds.length !==
      itemIds.length
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Duplicate menu items are not allowed in an order",
      });
    }

    // --------------------------------------------------------
    // GET MENU ITEMS
    // --------------------------------------------------------

    const placeholders = uniqueItemIds
      .map(() => "?")
      .join(",");

    const [menuItems] =
      await connection.query(
        `
        SELECT
          item_id,
          restaurant_id,
          name,
          price,
          is_available
        FROM menu_items
        WHERE item_id IN (${placeholders})
        `,
        uniqueItemIds
      );

    // --------------------------------------------------------
    // VERIFY ALL ITEMS EXIST
    // --------------------------------------------------------

    if (
      menuItems.length !==
      uniqueItemIds.length
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "One or more menu items were not found",
      });
    }

    // --------------------------------------------------------
    // CREATE MENU ITEM MAP
    // --------------------------------------------------------

    const menuItemMap = new Map();

    menuItems.forEach((item) => {
      menuItemMap.set(
        Number(item.item_id),
        item
      );
    });

    // --------------------------------------------------------
    // CALCULATE SUBTOTAL
    // --------------------------------------------------------

    let subtotal = 0;

    const orderItems = [];

    for (const cartItem of items) {
      const itemId = Number(
        cartItem.item_id
      );

      const quantity = Number(
        cartItem.quantity
      );

      const menuItem =
        menuItemMap.get(itemId);

      // ------------------------------------------------------
      // ITEM EXISTS
      // ------------------------------------------------------

      if (!menuItem) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            `Menu item ${itemId} not found`,
        });
      }

      // ------------------------------------------------------
      // SAME RESTAURANT
      // ------------------------------------------------------

      if (
        Number(menuItem.restaurant_id) !==
        Number(restaurant_id)
      ) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            "All items must belong to the selected restaurant",
        });
      }

      // ------------------------------------------------------
      // AVAILABILITY
      // ------------------------------------------------------

      if (
        Number(menuItem.is_available) !== 1
      ) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            `${menuItem.name} is currently unavailable`,
        });
      }

      // ------------------------------------------------------
      // QUANTITY
      // ------------------------------------------------------

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            `Invalid quantity for ${menuItem.name}`,
        });
      }

      // ------------------------------------------------------
      // DATABASE PRICE
      // ------------------------------------------------------

      const unitPrice = Number(
        menuItem.price
      );

      const itemTotal =
        unitPrice * quantity;

      subtotal += itemTotal;

      orderItems.push({
        item_id: itemId,
        quantity,
        unit_price: unitPrice,
      });
    }

    // --------------------------------------------------------
    // FINAL TOTAL
    // --------------------------------------------------------

    const totalAmount =
      subtotal + deliveryFee;

    // --------------------------------------------------------
    // INSERT ORDER
    // --------------------------------------------------------

    const [orderResult] =
      await connection.query(
        `
        INSERT INTO orders
        (
          user_id,
          restaurant_id,
          delivery_partner_id,
          address_id,
          group_order_id,
          total_amount,
          delivery_fee,
          status,
          payment_status
        )
        VALUES
        (
          ?,
          ?,
          NULL,
          ?,
          NULL,
          ?,
          ?,
          'PLACED',
          'PENDING'
        )
        `,
        [
          user_id,
          restaurant_id,
          address_id,
          totalAmount,
          deliveryFee,
        ]
      );

    const orderId =
      orderResult.insertId;

    // --------------------------------------------------------
    // INSERT ORDER ITEMS
    // --------------------------------------------------------

    for (const orderItem of orderItems) {
      await connection.query(
        `
        INSERT INTO order_items
        (
          order_id,
          item_id,
          quantity,
          unit_price
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          orderId,
          orderItem.item_id,
          orderItem.quantity,
          orderItem.unit_price,
        ]
      );
    }

    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    await connection.commit();

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        "Order created successfully",

      order: {
        order_id: orderId,
        user_id: Number(user_id),
        restaurant_id:
          Number(restaurant_id),
        restaurant_name:
          restaurant.name,
        address_id:
          Number(address_id),
        subtotal:
          Number(
            subtotal.toFixed(2)
          ),
        delivery_fee:
          Number(
            deliveryFee.toFixed(2)
          ),
        total_amount:
          Number(
            totalAmount.toFixed(2)
          ),
        status: "PLACED",
        payment_status: "PENDING",
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }
    }

    console.error(
      "Create order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create order",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// GET USER ORDERS
// ============================================================

const getUserOrders = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    const [orders] =
      await db.query(
        `
        SELECT
          o.order_id,
          o.user_id,
          o.restaurant_id,
          r.name AS restaurant_name,
          o.delivery_partner_id,
          o.address_id,
          o.group_order_id,
          o.total_amount,
          o.delivery_fee,
          o.status,
          o.payment_status,
          o.created_at,
          o.updated_at
        FROM orders o
        INNER JOIN restaurants r
          ON o.restaurant_id =
             r.restaurant_id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
        `,
        [userId]
      );

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Get user orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch user orders",
    });
  }
};

// ============================================================
// GET SINGLE ORDER
// ============================================================

const getOrderById = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    const [orders] =
      await db.query(
        `
        SELECT
          o.order_id,
          o.user_id,
          o.restaurant_id,
          r.name AS restaurant_name,

          o.delivery_partner_id,

          o.address_id,

          a.address_line,
          a.city,
          a.state,
          a.pincode,
          a.latitude,
          a.longitude,

          o.group_order_id,

          o.total_amount,
          o.delivery_fee,

          o.status,
          o.payment_status,

          p.payment_method,
          p.transaction_id,
          p.paid_at,

          o.created_at,
          o.updated_at

        FROM orders o

        INNER JOIN restaurants r
          ON o.restaurant_id =
             r.restaurant_id

        LEFT JOIN addresses a
          ON o.address_id =
             a.address_id

        LEFT JOIN payments p
          ON p.payment_id = (
            SELECT MAX(p2.payment_id)
            FROM payments p2
            WHERE p2.order_id =
                  o.order_id
          )

        WHERE o.order_id = ?

        LIMIT 1
        `,
        [orderId]
      );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    const [items] =
      await db.query(
        `
        SELECT
          oi.order_item_id,
          oi.order_id,
          oi.item_id,
          mi.name,
          mi.description,
          mi.image_url,
          oi.quantity,
          oi.unit_price,

          (
            oi.quantity *
            oi.unit_price
          ) AS item_total

        FROM order_items oi

        INNER JOIN menu_items mi
          ON oi.item_id =
             mi.item_id

        WHERE oi.order_id = ?

        ORDER BY oi.order_item_id ASC
        `,
        [orderId]
      );

    return res.json({
      success: true,

      order: {
        ...orders[0],
        items,
      },
    });
  } catch (error) {
    console.error(
      "Get order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch order",
    });
  }
};

// ============================================================
// UPDATE ORDER STATUS
// ============================================================

const updateOrderStatus = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    const { status } = req.body;

    const allowedStatuses = [
      "PLACED",
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ];

    if (
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid order status",
      });
    }

    const [result] =
      await db.query(
        `
        UPDATE orders
        SET
          status = ?,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE order_id = ?
        `,
        [
          status,
          orderId,
        ]
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    const [orders] =
      await db.query(
        `
        SELECT
          o.order_id,
          o.user_id,
          o.restaurant_id,
          r.name AS restaurant_name,

          o.delivery_partner_id,
          o.address_id,
          o.group_order_id,

          o.total_amount,
          o.delivery_fee,

          o.status,
          o.payment_status,

          o.created_at,
          o.updated_at

        FROM orders o

        INNER JOIN restaurants r
          ON o.restaurant_id =
             r.restaurant_id

        WHERE o.order_id = ?

        LIMIT 1
        `,
        [orderId]
      );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Updated order could not be found",
      });
    }

    const updatedOrder =
      orders[0];

    // --------------------------------------------------------
    // SOCKET.IO REAL-TIME UPDATE
    // --------------------------------------------------------

    const io =
      req.app.get("io");

    if (io) {
      const roomName =
        `order-${orderId}`;

      io.to(roomName).emit(
        "order-status-updated",
        {
          orderId:
            Number(orderId),

          status:
            updatedOrder.status,

          order:
            updatedOrder,

          timestamp:
            updatedOrder.updated_at ||
            new Date(),
        }
      );

      console.log(
        `📢 Real-time status sent to ${roomName}: ${status}`
      );
    }

    return res.json({
      success: true,

      message:
        "Order status updated successfully",

      order:
        updatedOrder,
    });
  } catch (error) {
    console.error(
      "Update order status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update order status",
    });
  }
};

// ============================================================
// GET RESTAURANT ORDERS
// ============================================================

const getRestaurantOrders = async (
  req,
  res
) => {
  try {
    const { restaurantId } = req.params;

    const [orders] =
      await db.query(
        `
        SELECT
          o.order_id,
          o.user_id,
          u.name AS customer_name,
          u.phone AS customer_phone,

          o.restaurant_id,
          r.name AS restaurant_name,

          o.address_id,

          o.total_amount,
          o.delivery_fee,

          o.status,
          o.payment_status,

          o.created_at,
          o.updated_at

        FROM orders o

        INNER JOIN users u
          ON o.user_id =
             u.user_id

        INNER JOIN restaurants r
          ON o.restaurant_id =
             r.restaurant_id

        WHERE o.restaurant_id = ?

        ORDER BY
          o.created_at DESC
        `,
        [restaurantId]
      );

    // --------------------------------------------------------
    // ADD ORDER ITEMS
    // --------------------------------------------------------

    for (const order of orders) {
      const [items] =
        await db.query(
          `
          SELECT
            oi.order_item_id,
            oi.item_id,
            mi.name,
            mi.description,
            mi.image_url,
            oi.quantity,
            oi.unit_price,
            (
              oi.quantity *
              oi.unit_price
            ) AS item_total

          FROM order_items oi

          INNER JOIN menu_items mi
            ON oi.item_id =
               mi.item_id

          WHERE oi.order_id = ?

          ORDER BY
            oi.order_item_id ASC
          `,
          [order.order_id]
        );

      order.items = items;
    }

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error(
      "Get restaurant orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch restaurant orders",
    });
  }
};

// ============================================================
// GET RESTAURANT ORDER HISTORY
// ============================================================

const getRestaurantOrderHistory = async (
  req,
  res
) => {
  try {
    const { restaurantId } =
      req.params;

    const [orders] =
      await db.query(
        `
        SELECT
          o.order_id,
          o.user_id,
          u.name AS customer_name,
          u.phone AS customer_phone,

          o.restaurant_id,
          r.name AS restaurant_name,

          o.address_id,

          o.total_amount,
          o.delivery_fee,

          o.status,
          o.payment_status,

          o.created_at,
          o.updated_at

        FROM orders o

        INNER JOIN users u
          ON o.user_id =
             u.user_id

        INNER JOIN restaurants r
          ON o.restaurant_id =
             r.restaurant_id

        WHERE o.restaurant_id = ?

        AND o.status IN (
          'DELIVERED',
          'CANCELLED'
        )

        ORDER BY
          o.created_at DESC
        `,
        [restaurantId]
      );

    // --------------------------------------------------------
    // ADD ITEMS
    // --------------------------------------------------------

    for (const order of orders) {
      const [items] =
        await db.query(
          `
          SELECT
            oi.order_item_id,
            oi.item_id,
            mi.name,
            oi.quantity,
            oi.unit_price,
            (
              oi.quantity *
              oi.unit_price
            ) AS item_total

          FROM order_items oi

          INNER JOIN menu_items mi
            ON oi.item_id =
               mi.item_id

          WHERE oi.order_id = ?

          ORDER BY
            oi.order_item_id ASC
          `,
          [order.order_id]
        );

      order.items = items;
    }

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error(
      "Get restaurant order history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch restaurant order history",
    });
  }
};

// ============================================================
// GET RESTAURANT ACTIVE ORDERS
// ============================================================

const getRestaurantActiveOrders = async (
  req,
  res
) => {
  try {
    const { restaurantId } =
      req.params;

    const [orders] =
      await db.query(
        `
        SELECT
          o.order_id,
          o.user_id,
          u.name AS customer_name,
          u.phone AS customer_phone,

          o.restaurant_id,
          r.name AS restaurant_name,

          o.address_id,

          o.total_amount,
          o.delivery_fee,

          o.status,
          o.payment_status,

          o.created_at,
          o.updated_at

        FROM orders o

        INNER JOIN users u
          ON o.user_id =
             u.user_id

        INNER JOIN restaurants r
          ON o.restaurant_id =
             r.restaurant_id

        WHERE o.restaurant_id = ?

        AND o.status IN (
          'PLACED',
          'CONFIRMED',
          'PREPARING',
          'READY_FOR_PICKUP'
        )

        ORDER BY
          o.created_at DESC
        `,
        [restaurantId]
      );

    // --------------------------------------------------------
    // ADD ITEMS
    // --------------------------------------------------------

    for (const order of orders) {
      const [items] =
        await db.query(
          `
          SELECT
            oi.order_item_id,
            oi.item_id,
            mi.name,
            oi.quantity,
            oi.unit_price,
            (
              oi.quantity *
              oi.unit_price
            ) AS item_total

          FROM order_items oi

          INNER JOIN menu_items mi
            ON oi.item_id =
               mi.item_id

          WHERE oi.order_id = ?

          ORDER BY
            oi.order_item_id ASC
          `,
          [order.order_id]
        );

      order.items = items;
    }

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error(
      "Get restaurant active orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch active restaurant orders",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getRestaurantOrders,
  getRestaurantOrderHistory,
  getRestaurantActiveOrders,
};