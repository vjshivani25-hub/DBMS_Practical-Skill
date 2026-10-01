const db = require("../config/db");

/*
=========================================================
GET DELIVERY PARTNER PROFILE
=========================================================
*/
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
      INNER JOIN users u
        ON u.user_id = dp.user_id
      WHERE dp.partner_id = ?
      `,
      [partnerId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found.",
      });
    }

    res.json({
      success: true,
      partner: rows[0],
    });
  } catch (error) {
    console.error("Get delivery partner error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery partner.",
    });
  }
};

/*
=========================================================
GET DELIVERY DASHBOARD
=========================================================
*/
const getDeliveryDashboard = async (req, res) => {
  try {
    const { partnerId } = req.params;

    /*
      AVAILABLE ORDERS

      Orders that restaurant has marked:
      READY_FOR_PICKUP

      and no delivery partner assigned yet.
    */
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
        r.city AS restaurant_city,

        a.address_line AS customer_address,
        a.city AS customer_city,
        a.state AS customer_state,
        a.pincode AS customer_pincode,

        DATEDIFF(NOW(), o.created_at) AS order_age_days

      FROM orders o

      INNER JOIN users u
        ON u.user_id = o.user_id

      INNER JOIN restaurants r
        ON r.restaurant_id = o.restaurant_id

      LEFT JOIN addresses a
        ON a.address_id = o.address_id

      WHERE o.status = 'READY_FOR_PICKUP'
        AND o.delivery_partner_id IS NULL

      ORDER BY o.created_at ASC
      `
    );

    /*
      MY ACTIVE ORDERS
    */
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
        r.city AS restaurant_city,

        a.address_line AS customer_address,
        a.city AS customer_city,
        a.state AS customer_state,
        a.pincode AS customer_pincode

      FROM orders o

      INNER JOIN users u
        ON u.user_id = o.user_id

      INNER JOIN restaurants r
        ON r.restaurant_id = o.restaurant_id

      LEFT JOIN addresses a
        ON a.address_id = o.address_id

      WHERE o.delivery_partner_id = ?
        AND o.status IN (
          'READY_FOR_PICKUP',
          'OUT_FOR_DELIVERY'
        )

      ORDER BY o.created_at DESC
      `,
      [partnerId]
    );

    /*
      COMPLETED ORDERS
    */
    const [completedOrders] = await db.query(
      `
      SELECT
        o.order_id,
        o.user_id,
        o.restaurant_id,
        o.delivery_partner_id,
        o.total_amount,
        o.delivery_fee,
        o.status,
        o.payment_status,
        o.created_at,
        o.updated_at,

        u.name AS customer_name,
        u.phone AS customer_phone,

        r.name AS restaurant_name

      FROM orders o

      INNER JOIN users u
        ON u.user_id = o.user_id

      INNER JOIN restaurants r
        ON r.restaurant_id = o.restaurant_id

      WHERE o.delivery_partner_id = ?
        AND o.status = 'DELIVERED'

      ORDER BY o.updated_at DESC
      LIMIT 50
      `,
      [partnerId]
    );

    /*
      TOTAL EARNINGS

      For demo/project purpose:
      delivery fee is counted as delivery earning.
    */
    const [earningRows] = await db.query(
      `
      SELECT
        COALESCE(SUM(delivery_fee), 0) AS total_earnings
      FROM orders
      WHERE delivery_partner_id = ?
        AND status = 'DELIVERED'
      `,
      [partnerId]
    );

    /*
      PARTNER PROFILE
    */
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
      INNER JOIN users u
        ON u.user_id = dp.user_id
      WHERE dp.partner_id = ?
      `,
      [partnerId]
    );

    if (!partnerRows.length) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found.",
      });
    }

    res.json({
      success: true,

      partner: partnerRows[0],

      availableOrders,

      activeOrders,

      completedOrders,

      stats: {
        availableOrders: availableOrders.length,
        activeOrders: activeOrders.length,
        completedOrders: completedOrders.length,
        totalEarnings: Number(
          earningRows[0]?.total_earnings || 0
        ),
      },
    });
  } catch (error) {
    console.error("Delivery dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load delivery dashboard.",
    });
  }
};

/*
=========================================================
ACCEPT ORDER
=========================================================
*/
const acceptDeliveryOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { partnerId, orderId } = req.params;

    await connection.beginTransaction();

    /*
      Check partner
    */
    const [partnerRows] = await connection.query(
      `
      SELECT
        partner_id,
        user_id,
        availability_status
      FROM delivery_partners
      WHERE partner_id = ?
      FOR UPDATE
      `,
      [partnerId]
    );

    if (!partnerRows.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Delivery partner not found.",
      });
    }

    /*
      Check order
    */
    const [orderRows] = await connection.query(
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

    if (!orderRows.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const order = orderRows[0];

    if (order.status !== "READY_FOR_PICKUP") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "This order is not ready for pickup.",
      });
    }

    if (order.delivery_partner_id) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "This order has already been accepted by another delivery partner.",
      });
    }

    /*
      Assign partner
    */
    await connection.query(
      `
      UPDATE orders
      SET
        delivery_partner_id = ?,
        updated_at = NOW()
      WHERE order_id = ?
      `,
      [partnerId, orderId]
    );

    /*
      Mark partner busy
    */
    await connection.query(
      `
      UPDATE delivery_partners
      SET availability_status = 'BUSY'
      WHERE partner_id = ?
      `,
      [partnerId]
    );

    /*
      Tracking entry
    */
    await connection.query(
      `
      INSERT INTO order_tracking
      (
        order_id,
        delivery_partner_id,
        status,
        latitude,
        longitude,
        updated_at
      )
      VALUES (?, ?, ?, NULL, NULL, NOW())
      `,
      [
        orderId,
        partnerId,
        "READY_FOR_PICKUP",
      ]
    );

    await connection.commit();

    /*
      Get updated order
    */
    const [updatedRows] = await db.query(
      `
      SELECT
        o.order_id,
        o.delivery_partner_id,
        o.status,
        o.total_amount,
        o.delivery_fee,
        r.name AS restaurant_name,
        u.name AS customer_name
      FROM orders o
      INNER JOIN restaurants r
        ON r.restaurant_id = o.restaurant_id
      INNER JOIN users u
        ON u.user_id = o.user_id
      WHERE o.order_id = ?
      `,
      [orderId]
    );

    const io = req.app.get("io");

    if (io) {
      io.emit("delivery-order-assigned", {
        orderId: Number(orderId),
        partnerId: Number(partnerId),
      });
    }

    res.json({
      success: true,
      message: "Order accepted successfully.",
      order: updatedRows[0],
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Accept delivery order error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to accept order.",
    });
  } finally {
    connection.release();
  }
};

/*
=========================================================
UPDATE DELIVERY STATUS
=========================================================
*/
const updateDeliveryStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { partnerId, orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Delivery partner can only set OUT_FOR_DELIVERY or DELIVERED.",
      });
    }

    await connection.beginTransaction();

    /*
      Check assigned order
    */
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

    if (!orders.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Order not found.",
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
          "This order is not assigned to you.",
      });
    }

    /*
      Validate transition
    */
    if (
      status === "OUT_FOR_DELIVERY" &&
      order.status !== "READY_FOR_PICKUP"
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Order must be READY_FOR_PICKUP before starting delivery.",
      });
    }

    if (
      status === "DELIVERED" &&
      order.status !== "OUT_FOR_DELIVERY"
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Order must be OUT_FOR_DELIVERY before marking delivered.",
      });
    }

    /*
      Update order
    */
    await connection.query(
      `
      UPDATE orders
      SET
        status = ?,
        updated_at = NOW()
      WHERE order_id = ?
      `,
      [status, orderId]
    );

    /*
      Tracking
    */
    await connection.query(
      `
      INSERT INTO order_tracking
      (
        order_id,
        delivery_partner_id,
        status,
        latitude,
        longitude,
        updated_at
      )
      VALUES (?, ?, ?, NULL, NULL, NOW())
      `,
      [
        orderId,
        partnerId,
        status,
      ]
    );

    /*
      Partner becomes available after delivery.
    */
    if (status === "DELIVERED") {
      await connection.query(
        `
        UPDATE delivery_partners
        SET availability_status = 'AVAILABLE'
        WHERE partner_id = ?
        `,
        [partnerId]
      );
    }

    await connection.commit();

    /*
      Get updated order
    */
    const [updatedRows] = await db.query(
      `
      SELECT
        o.*,
        r.name AS restaurant_name,
        u.name AS customer_name,
        u.phone AS customer_phone,
        a.address_line AS customer_address,
        a.city AS customer_city,
        a.state AS customer_state,
        a.pincode AS customer_pincode
      FROM orders o

      INNER JOIN restaurants r
        ON r.restaurant_id = o.restaurant_id

      INNER JOIN users u
        ON u.user_id = o.user_id

      LEFT JOIN addresses a
        ON a.address_id = o.address_id

      WHERE o.order_id = ?
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
          status,
          order: updatedOrder,
          timestamp:
            updatedOrder.updated_at ||
            new Date(),
        }
      );

      io.emit("delivery-status-updated", {
        orderId: Number(orderId),
        partnerId: Number(partnerId),
        status,
      });
    }

    res.json({
      success: true,
      message:
        "Delivery status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Update delivery status error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to update delivery status.",
    });
  } finally {
    connection.release();
  }
};

/*
=========================================================
EXPORTS
=========================================================
*/

module.exports = {
  getDeliveryPartner,
  getDeliveryDashboard,
  acceptDeliveryOrder,
  updateDeliveryStatus,
};