const db = require("../config/db");

// ============================================================
// GET DELIVERY PARTNER PROFILE
// ============================================================

const getDeliveryPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        dp.partner_id,
        dp.user_id,
        dp.vehicle_type,
        dp.vehicle_number,
        dp.availability_status,
        dp.current_latitude,
        dp.current_longitude,
        u.name,
        u.email,
        u.phone
      FROM delivery_partners dp
      JOIN users u
        ON dp.user_id = u.user_id
      WHERE dp.partner_id = ?
      `,
      [partnerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    res.json({
      success: true,
      partner: rows[0],
    });
  } catch (error) {
    console.error(
      "Get delivery partner error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery partner",
    });
  }
};


// ============================================================
// GET DELIVERY PARTNER BY USER ID
// ============================================================

const getDeliveryPartnerByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        dp.partner_id,
        dp.user_id,
        dp.vehicle_type,
        dp.vehicle_number,
        dp.availability_status,
        dp.current_latitude,
        dp.current_longitude,
        u.name,
        u.email,
        u.phone
      FROM delivery_partners dp
      JOIN users u
        ON dp.user_id = u.user_id
      WHERE dp.user_id = ?
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found for this user",
      });
    }

    res.json({
      success: true,
      partner: rows[0],
    });
  } catch (error) {
    console.error(
      "Get delivery partner by user error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery partner",
    });
  }
};


// ============================================================
// GET DELIVERY DASHBOARD
// ============================================================

const getDeliveryDashboard = async (req, res) => {
  try {
    const { partnerId } = req.params;

    // --------------------------------------------------------
    // PARTNER
    // --------------------------------------------------------

    const [partnerRows] = await db.query(
      `
      SELECT
        dp.partner_id,
        dp.user_id,
        dp.vehicle_type,
        dp.vehicle_number,
        dp.availability_status,
        dp.current_latitude,
        dp.current_longitude,
        u.name,
        u.email,
        u.phone
      FROM delivery_partners dp
      JOIN users u
        ON dp.user_id = u.user_id
      WHERE dp.partner_id = ?
      `,
      [partnerId]
    );

    if (partnerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    const partner = partnerRows[0];

    // --------------------------------------------------------
    // AVAILABLE ORDERS
    // --------------------------------------------------------

    const [availableOrders] = await db.query(
      `
      SELECT
        o.order_id,
        o.user_id,
        o.restaurant_id,
        o.delivery_partner_id,
        o.address_id,
        o.total_amount,
        o.delivery_fee,
        o.status,
        o.payment_status,
        o.created_at,
        o.updated_at,

        u.name AS customer_name,
        u.phone AS customer_phone,

        r.name AS restaurant_name,
        r.address AS restaurant_address,

        a.address_line AS customer_address,
        a.city AS customer_city,
        a.state AS customer_state,
        a.pincode AS customer_pincode

      FROM orders o

      JOIN users u
        ON o.user_id = u.user_id

      JOIN restaurants r
        ON o.restaurant_id = r.restaurant_id

      LEFT JOIN addresses a
        ON o.address_id = a.address_id

      WHERE
        o.status = 'READY_FOR_PICKUP'
        AND o.delivery_partner_id IS NULL

      ORDER BY o.created_at DESC
      `
    );

    // --------------------------------------------------------
    // ACTIVE ORDERS
    // --------------------------------------------------------

    const [activeOrders] = await db.query(
      `
      SELECT
        o.order_id,
        o.user_id,
        o.restaurant_id,
        o.delivery_partner_id,
        o.address_id,
        o.total_amount,
        o.delivery_fee,
        o.status,
        o.payment_status,
        o.created_at,
        o.updated_at,

        u.name AS customer_name,
        u.phone AS customer_phone,

        r.name AS restaurant_name,
        r.address AS restaurant_address,

        a.address_line AS customer_address,
        a.city AS customer_city,
        a.state AS customer_state,
        a.pincode AS customer_pincode

      FROM orders o

      JOIN users u
        ON o.user_id = u.user_id

      JOIN restaurants r
        ON o.restaurant_id = r.restaurant_id

      LEFT JOIN addresses a
        ON o.address_id = a.address_id

      WHERE
        o.delivery_partner_id = ?
        AND o.status IN (
          'READY_FOR_PICKUP',
          'OUT_FOR_DELIVERY'
        )

      ORDER BY o.updated_at DESC
      `,
      [partnerId]
    );

    // --------------------------------------------------------
    // COMPLETED ORDERS
    // --------------------------------------------------------

    const [completedOrders] = await db.query(
      `
      SELECT
        o.order_id,
        o.user_id,
        o.restaurant_id,
        o.delivery_partner_id,
        o.address_id,
        o.total_amount,
        o.delivery_fee,
        o.status,
        o.payment_status,
        o.created_at,
        o.updated_at,

        u.name AS customer_name,
        u.phone AS customer_phone,

        r.name AS restaurant_name,
        r.address AS restaurant_address,

        a.address_line AS customer_address,
        a.city AS customer_city,
        a.state AS customer_state,
        a.pincode AS customer_pincode

      FROM orders o

      JOIN users u
        ON o.user_id = u.user_id

      JOIN restaurants r
        ON o.restaurant_id = r.restaurant_id

      LEFT JOIN addresses a
        ON o.address_id = a.address_id

      WHERE
        o.delivery_partner_id = ?
        AND o.status = 'DELIVERED'

      ORDER BY o.updated_at DESC
      `,
      [partnerId]
    );

    // --------------------------------------------------------
    // STATS
    // --------------------------------------------------------

    const [earningRows] = await db.query(
      `
      SELECT
        COUNT(*) AS completed_orders,
        COALESCE(
          SUM(delivery_fee),
          0
        ) AS total_earnings
      FROM orders
      WHERE
        delivery_partner_id = ?
        AND status = 'DELIVERED'
      `,
      [partnerId]
    );

    const stats = {
      availableOrders: availableOrders.length,
      activeOrders: activeOrders.length,
      completedOrders:
        Number(
          earningRows[0]?.completed_orders || 0
        ),
      totalEarnings:
        Number(
          earningRows[0]?.total_earnings || 0
        ),
    };

    res.json({
      success: true,
      partner,
      stats,
      availableOrders,
      activeOrders,
      completedOrders,
    });
  } catch (error) {
    console.error(
      "Get delivery dashboard error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to load delivery dashboard",
    });
  }
};


// ============================================================
// GET DELIVERY ORDERS
// ============================================================

const getDeliveryOrders = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const [orders] = await db.query(
      `
      SELECT
        o.order_id,
        o.user_id,
        o.restaurant_id,
        o.delivery_partner_id,
        o.address_id,
        o.total_amount,
        o.delivery_fee,
        o.status,
        o.payment_status,
        o.created_at,
        o.updated_at,

        u.name AS customer_name,
        u.phone AS customer_phone,

        r.name AS restaurant_name,
        r.address AS restaurant_address,

        a.address_line AS customer_address,
        a.city AS customer_city,
        a.state AS customer_state,
        a.pincode AS customer_pincode

      FROM orders o

      JOIN users u
        ON o.user_id = u.user_id

      JOIN restaurants r
        ON o.restaurant_id = r.restaurant_id

      LEFT JOIN addresses a
        ON o.address_id = a.address_id

      WHERE
        (
          o.status = 'READY_FOR_PICKUP'
          AND o.delivery_partner_id IS NULL
        )
        OR
        (
          o.delivery_partner_id = ?
          AND o.status IN (
            'READY_FOR_PICKUP',
            'OUT_FOR_DELIVERY',
            'DELIVERED'
          )
        )

      ORDER BY o.created_at DESC
      `,
      [partnerId]
    );

    for (const order of orders) {
      const [items] = await db.query(
        `
        SELECT
          oi.order_item_id,
          oi.item_id,
          oi.quantity,
          oi.unit_price,
          mi.name AS item_name
        FROM order_items oi
        JOIN menu_items mi
          ON oi.item_id = mi.item_id
        WHERE oi.order_id = ?
        `,
        [order.order_id]
      );

      order.items = items;
    }

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Get delivery orders error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery orders",
    });
  }
};


// ============================================================
// PICKUP ORDER
// ============================================================

const pickupOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { orderId } = req.params;
    const { partnerId } = req.body;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "partnerId is required",
      });
    }

    await connection.beginTransaction();

    const [partners] = await connection.query(
      `
      SELECT partner_id
      FROM delivery_partners
      WHERE partner_id = ?
      `,
      [partnerId]
    );

    if (partners.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    const [orders] = await connection.query(
      `
      SELECT
        order_id,
        delivery_partner_id,
        status
      FROM orders
      WHERE order_id = ?
      FOR UPDATE
      `,
      [orderId]
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];

    if (order.status !== "READY_FOR_PICKUP") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          `Order cannot be picked up from status ${order.status}`,
      });
    }

    if (
      order.delivery_partner_id !== null &&
      Number(order.delivery_partner_id) !== Number(partnerId)
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Order is already assigned to another delivery partner",
      });
    }

    await connection.query(
      `
      UPDATE orders
      SET
        delivery_partner_id = ?,
        status = 'OUT_FOR_DELIVERY',
        updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
      `,
      [partnerId, orderId]
    );

    await connection.query(
      `
      UPDATE delivery_partners
      SET availability_status = 'BUSY'
      WHERE partner_id = ?
      `,
      [partnerId]
    );

    await connection.query(
      `
      INSERT INTO order_tracking
      (
        order_id,
        delivery_partner_id,
        status,
        latitude,
        longitude
      )
      VALUES (?, ?, 'OUT_FOR_DELIVERY', NULL, NULL)
      `,
      [orderId, partnerId]
    );

    await connection.commit();

    const [updatedRows] = await db.query(
      `
      SELECT
        order_id,
        delivery_partner_id,
        status,
        updated_at
      FROM orders
      WHERE order_id = ?
      `,
      [orderId]
    );

    const updatedOrder = updatedRows[0];

    const io = req.app.get("io");

    if (io) {
      io.to(`order-${orderId}`).emit(
        "order-status-updated",
        {
          orderId: Number(orderId),
          status: updatedOrder.status,
          order: updatedOrder,
          timestamp: updatedOrder.updated_at,
        }
      );
    }

    res.json({
      success: true,
      message: "Order picked up successfully",
      order: updatedOrder,
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Pickup order error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to pick up order",
    });
  } finally {
    connection.release();
  }
};


// ============================================================
// DELIVER ORDER
// ============================================================

const deliverOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { orderId } = req.params;
    const { partnerId } = req.body;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "partnerId is required",
      });
    }

    await connection.beginTransaction();

    const [orders] = await connection.query(
      `
      SELECT
        order_id,
        delivery_partner_id,
        status
      FROM orders
      WHERE order_id = ?
      FOR UPDATE
      `,
      [orderId]
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];

    if (
      Number(order.delivery_partner_id) !==
      Number(partnerId)
    ) {
      await connection.rollback();

      return res.status(403).json({
        success: false,
        message:
          "This order is not assigned to this delivery partner",
      });
    }

    if (order.status !== "OUT_FOR_DELIVERY") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          `Order cannot be delivered from status ${order.status}`,
      });
    }

    await connection.query(
      `
      UPDATE orders
      SET
        status = 'DELIVERED',
        updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
      `,
      [orderId]
    );

    await connection.query(
      `
      UPDATE delivery_partners
      SET availability_status = 'AVAILABLE'
      WHERE partner_id = ?
      `,
      [partnerId]
    );

    await connection.query(
      `
      INSERT INTO order_tracking
      (
        order_id,
        delivery_partner_id,
        status,
        latitude,
        longitude
      )
      VALUES (?, ?, 'DELIVERED', NULL, NULL)
      `,
      [orderId, partnerId]
    );

    await connection.commit();

    const [updatedRows] = await db.query(
      `
      SELECT
        order_id,
        delivery_partner_id,
        status,
        updated_at
      FROM orders
      WHERE order_id = ?
      `,
      [orderId]
    );

    const updatedOrder = updatedRows[0];

    const io = req.app.get("io");

    if (io) {
      io.to(`order-${orderId}`).emit(
        "order-status-updated",
        {
          orderId: Number(orderId),
          status: updatedOrder.status,
          order: updatedOrder,
          timestamp: updatedOrder.updated_at,
        }
      );
    }

    res.json({
      success: true,
      message: "Order delivered successfully",
      order: updatedOrder,
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Deliver order error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to deliver order",
    });
  } finally {
    connection.release();
  }
};


// ============================================================
// UPDATE AVAILABILITY
// ============================================================

const updateAvailability = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { availability_status } = req.body;

    const allowedStatuses = [
      "AVAILABLE",
      "BUSY",
      "OFFLINE",
    ];

    if (!allowedStatuses.includes(availability_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid availability status",
      });
    }

    const [result] = await db.query(
      `
      UPDATE delivery_partners
      SET availability_status = ?
      WHERE partner_id = ?
      `,
      [
        availability_status,
        partnerId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    res.json({
      success: true,
      message:
        "Availability updated successfully",
      availability_status,
    });
  } catch (error) {
    console.error(
      "Update availability error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to update availability",
    });
  }
};


module.exports = {
  getDeliveryPartner,
  getDeliveryPartnerByUser,
  getDeliveryDashboard,
  getDeliveryOrders,
  pickupOrder,
  deliverOrder,
  updateAvailability,
};