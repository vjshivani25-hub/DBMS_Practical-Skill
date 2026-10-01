const db = require("../config/db");

// ============================================================
// GENERATE UNIQUE GROUP CODE
// ============================================================

function generateGroupCode() {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}

// ============================================================
// CREATE GROUP ORDER
// ============================================================

const createGroupOrder = async (req, res) => {
  let connection;

  try {
    const { userId, restaurantId } = req.body;

    if (!userId || !restaurantId) {
      return res.status(400).json({
        success: false,
        message: "userId and restaurantId are required",
      });
    }

    connection = await db.getConnection();

    // --------------------------------------------------------
    // CHECK USER
    // --------------------------------------------------------

    const [users] = await connection.query(
      `
      SELECT user_id, name, email
      FROM users
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (users.length === 0) {
      connection.release();

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
      SELECT restaurant_id, name
      FROM restaurants
      WHERE restaurant_id = ?
      LIMIT 1
      `,
      [restaurantId]
    );

    if (restaurants.length === 0) {
      connection.release();

      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // --------------------------------------------------------
    // GENERATE UNIQUE CODE
    // --------------------------------------------------------

    let groupCode;
    let codeExists = true;

    while (codeExists) {
      groupCode = generateGroupCode();

      const [existing] = await connection.query(
        `
        SELECT group_order_id
        FROM group_orders
        WHERE group_code = ?
        LIMIT 1
        `,
        [groupCode]
      );

      codeExists = existing.length > 0;
    }

    // --------------------------------------------------------
    // START TRANSACTION
    // --------------------------------------------------------

    await connection.beginTransaction();

    // --------------------------------------------------------
    // CREATE GROUP
    // --------------------------------------------------------

    const [groupResult] = await connection.query(
      `
      INSERT INTO group_orders
      (
        creator_id,
        restaurant_id,
        group_code,
        status
      )
      VALUES (?, ?, ?, 'OPEN')
      `,
      [
        Number(userId),
        Number(restaurantId),
        groupCode,
      ]
    );

    const groupOrderId = groupResult.insertId;

    // --------------------------------------------------------
    // ADD CREATOR AS MEMBER
    // --------------------------------------------------------

    await connection.query(
      `
      INSERT INTO group_members
      (
        group_order_id,
        user_id
      )
      VALUES (?, ?)
      `,
      [
        groupOrderId,
        Number(userId),
      ]
    );

    await connection.commit();

    connection.release();
    connection = null;

    // --------------------------------------------------------
    // SOCKET EVENT
    // --------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.emit("group-order-created", {
        groupOrderId,
        groupCode,
        restaurantId: Number(restaurantId),
      });
    }

    return res.status(201).json({
      success: true,
      message: "Group order created successfully",
      group: {
        group_order_id: groupOrderId,
        group_code: groupCode,
        creator_id: Number(userId),
        restaurant_id: Number(restaurantId),
        restaurant_name: restaurants[0].name,
        status: "OPEN",
      },
    });
  } catch (error) {
    console.error("❌ createGroupOrder:", error);

    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch {}
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create group order",
      error: error.message,
    });
  }
};

// ============================================================
// JOIN GROUP ORDER
// ============================================================

const joinGroupOrder = async (req, res) => {
  let connection;

  try {
    const { groupCode, userId } = req.body;

    if (!groupCode || !userId) {
      return res.status(400).json({
        success: false,
        message: "Group code and user ID are required",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    // --------------------------------------------------------
    // FIND GROUP
    // --------------------------------------------------------

    const [groups] = await connection.query(
      `
      SELECT
        go.group_order_id,
        go.creator_id,
        go.restaurant_id,
        go.group_code,
        go.status,
        r.name AS restaurant_name
      FROM group_orders go
      JOIN restaurants r
        ON r.restaurant_id = go.restaurant_id
      WHERE UPPER(go.group_code) = UPPER(?)
      LIMIT 1
      `,
      [String(groupCode).trim()]
    );

    if (groups.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(404).json({
        success: false,
        message: "Group not found. Check the group code.",
      });
    }

    const group = groups[0];

    // --------------------------------------------------------
    // IMPORTANT:
    // USERS CAN JOIN ONLY WHILE GROUP IS OPEN
    // --------------------------------------------------------

    if (group.status !== "OPEN") {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(400).json({
        success: false,
        message:
          `This group is already ${group.status}. ` +
          `New members cannot join after checkout has started.`,
        groupStatus: group.status,
      });
    }

    // --------------------------------------------------------
    // CHECK USER
    // --------------------------------------------------------

    const [users] = await connection.query(
      `
      SELECT user_id, name, email
      FROM users
      WHERE user_id = ?
      LIMIT 1
      `,
      [Number(userId)]
    );

    if (users.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // --------------------------------------------------------
    // CHECK EXISTING MEMBER
    // --------------------------------------------------------

    const [existingMember] = await connection.query(
      `
      SELECT group_member_id
      FROM group_members
      WHERE group_order_id = ?
      AND user_id = ?
      LIMIT 1
      `,
      [
        group.group_order_id,
        Number(userId),
      ]
    );

    let alreadyMember = false;

    if (existingMember.length > 0) {
      alreadyMember = true;
    } else {
      // ------------------------------------------------------
      // INSERT MEMBER
      // ------------------------------------------------------

      await connection.query(
        `
        INSERT INTO group_members
        (
          group_order_id,
          user_id
        )
        VALUES (?, ?)
        `,
        [
          group.group_order_id,
          Number(userId),
        ]
      );
    }

    // --------------------------------------------------------
    // GET UPDATED MEMBERS BEFORE COMMIT
    // --------------------------------------------------------

    const [members] = await connection.query(
      `
      SELECT
        gm.group_member_id,
        gm.group_order_id,
        gm.user_id,
        gm.joined_at,
        u.name,
        u.email
      FROM group_members gm
      JOIN users u
        ON u.user_id = gm.user_id
      WHERE gm.group_order_id = ?
      ORDER BY gm.joined_at ASC
      `,
      [group.group_order_id]
    );

    await connection.commit();

    connection.release();
    connection = null;

    // --------------------------------------------------------
    // SOCKET
    // --------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.to(`group-order-${group.group_order_id}`).emit(
        "group-member-joined",
        {
          groupOrderId: group.group_order_id,
          groupCode: group.group_code,
          member: users[0],
          members,
        }
      );
    }

    return res.json({
      success: true,
      message: alreadyMember
        ? "You are already a member of this group"
        : "Joined group successfully",
      alreadyMember,
      group: {
        group_order_id: group.group_order_id,
        creator_id: group.creator_id,
        restaurant_id: group.restaurant_id,
        group_code: group.group_code,
        restaurant_name: group.restaurant_name,
        status: group.status,
        members,
      },
    });
  } catch (error) {
    console.error("❌ joinGroupOrder:", error);

    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch {}
    }

    return res.status(500).json({
      success: false,
      message: "Failed to join group order",
      error: error.message,
    });
  }
};

// ============================================================
// GET COMPLETE GROUP
// ============================================================

const getGroupOrder = async (req, res) => {
  try {
    const { groupCode } = req.params;

    const [groups] = await db.query(
      `
      SELECT
        go.group_order_id,
        go.creator_id,
        go.restaurant_id,
        go.group_code,
        go.status,
        go.created_at,
        r.name AS restaurant_name
      FROM group_orders go
      JOIN restaurants r
        ON r.restaurant_id = go.restaurant_id
      WHERE UPPER(go.group_code) = UPPER(?)
      LIMIT 1
      `,
      [String(groupCode).trim()]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groups[0];

    // --------------------------------------------------------
    // MEMBERS
    // --------------------------------------------------------

    const [members] = await db.query(
      `
      SELECT
        gm.group_member_id,
        gm.group_order_id,
        gm.user_id,
        gm.joined_at,
        u.name,
        u.email
      FROM group_members gm
      JOIN users u
        ON u.user_id = gm.user_id
      WHERE gm.group_order_id = ?
      ORDER BY gm.joined_at ASC
      `,
      [group.group_order_id]
    );

    // --------------------------------------------------------
    // CART
    // --------------------------------------------------------

    const [cartItems] = await db.query(
      `
      SELECT
        gci.group_cart_item_id,
        gci.group_order_id,
        gci.user_id,
        gci.item_id,
        gci.quantity,
        gci.unit_price,
        gci.created_at,

        u.name AS user_name,

        mi.name AS item_name,
        mi.description,
        mi.image_url,
        mi.price AS current_price

      FROM group_cart_items gci

      JOIN users u
        ON u.user_id = gci.user_id

      JOIN menu_items mi
        ON mi.item_id = gci.item_id

      WHERE gci.group_order_id = ?

      ORDER BY gci.created_at ASC
      `,
      [group.group_order_id]
    );

    // --------------------------------------------------------
    // PAYMENTS
    // --------------------------------------------------------

    const [payments] = await db.query(
      `
      SELECT
        gp.group_payment_id,
        gp.group_order_id,
        gp.user_id,
        gp.amount,
        gp.payment_status,
        gp.paid_at,
        u.name,
        u.email
      FROM group_payments gp
      JOIN users u
        ON u.user_id = gp.user_id
      WHERE gp.group_order_id = ?
      ORDER BY gp.group_payment_id ASC
      `,
      [group.group_order_id]
    );

    // --------------------------------------------------------
    // TOTAL
    // --------------------------------------------------------

    const total = cartItems.reduce(
      (sum, item) =>
        sum +
        Number(item.unit_price) *
          Number(item.quantity),
      0
    );

    return res.json({
      success: true,

      group: {
        ...group,

        members,

        cartItems,

        payments,

        total: Number(total.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("❌ getGroupOrder:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group order",
      error: error.message,
    });
  }
};

// ============================================================
// ADD GROUP CART ITEM
// ============================================================

const addGroupCartItem = async (req, res) => {
  let connection;

  try {
    const { groupCode } = req.params;

    const {
      userId,
      itemId,
      quantity = 1,
    } = req.body;

    if (!groupCode || !userId || !itemId) {
      return res.status(400).json({
        success: false,
        message:
          "groupCode, userId and itemId are required",
      });
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    connection = await db.getConnection();

    // --------------------------------------------------------
    // GET GROUP
    // --------------------------------------------------------

    const [groups] = await connection.query(
      `
      SELECT
        group_order_id,
        restaurant_id,
        group_code,
        status
      FROM group_orders
      WHERE UPPER(group_code) = UPPER(?)
      LIMIT 1
      `,
      [String(groupCode).trim()]
    );

    if (groups.length === 0) {
      connection.release();
      connection = null;

      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groups[0];

    // --------------------------------------------------------
    // CART CAN ONLY BE CHANGED WHILE OPEN
    // --------------------------------------------------------

    if (group.status !== "OPEN") {
      connection.release();
      connection = null;

      return res.status(400).json({
        success: false,
        message:
          `Cart cannot be changed because group is ${group.status}. ` +
          `Add all items before starting checkout.`,
        groupStatus: group.status,
      });
    }

    // --------------------------------------------------------
    // CHECK MEMBER
    // --------------------------------------------------------

    const [members] = await connection.query(
      `
      SELECT group_member_id
      FROM group_members
      WHERE group_order_id = ?
      AND user_id = ?
      LIMIT 1
      `,
      [
        group.group_order_id,
        Number(userId),
      ]
    );

    if (members.length === 0) {
      connection.release();
      connection = null;

      return res.status(403).json({
        success: false,
        message:
          "You are not a member of this group. Join the group first.",
      });
    }

    // --------------------------------------------------------
    // CHECK MENU ITEM
    // --------------------------------------------------------

    const [items] = await connection.query(
      `
      SELECT
        item_id,
        restaurant_id,
        name,
        price,
        image_url,
        is_available
      FROM menu_items
      WHERE item_id = ?
      LIMIT 1
      `,
      [Number(itemId)]
    );

    if (items.length === 0) {
      connection.release();
      connection = null;

      return res.status(404).json({
        success: false,
        message: "Food item not found",
      });
    }

    const item = items[0];

    // --------------------------------------------------------
    // RESTAURANT VALIDATION
    // --------------------------------------------------------

    if (
      Number(item.restaurant_id) !==
      Number(group.restaurant_id)
    ) {
      connection.release();
      connection = null;

      return res.status(400).json({
        success: false,
        message:
          "This food item belongs to another restaurant",
      });
    }

    // --------------------------------------------------------
    // AVAILABILITY
    // --------------------------------------------------------

    if (!item.is_available) {
      connection.release();
      connection = null;

      return res.status(400).json({
        success: false,
        message: "This food item is currently unavailable",
      });
    }

    // --------------------------------------------------------
    // CHECK EXISTING CART ITEM
    // --------------------------------------------------------

    const [existing] = await connection.query(
      `
      SELECT
        group_cart_item_id,
        quantity
      FROM group_cart_items
      WHERE group_order_id = ?
      AND user_id = ?
      AND item_id = ?
      LIMIT 1
      `,
      [
        group.group_order_id,
        Number(userId),
        Number(itemId),
      ]
    );

    let cartItemId;

    if (existing.length > 0) {
      // ------------------------------------------------------
      // INCREMENT
      // ------------------------------------------------------

      cartItemId =
        existing[0].group_cart_item_id;

      await connection.query(
        `
        UPDATE group_cart_items
        SET quantity = quantity + ?
        WHERE group_cart_item_id = ?
        `,
        [
          qty,
          cartItemId,
        ]
      );
    } else {
      // ------------------------------------------------------
      // INSERT
      // ------------------------------------------------------

      const [result] =
        await connection.query(
          `
          INSERT INTO group_cart_items
          (
            group_order_id,
            user_id,
            item_id,
            quantity,
            unit_price
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            group.group_order_id,
            Number(userId),
            Number(itemId),
            qty,
            Number(item.price),
          ]
        );

      cartItemId = result.insertId;
    }

    connection.release();
    connection = null;

    // --------------------------------------------------------
    // SOCKET
    // --------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.to(
        `group-order-${group.group_order_id}`
      ).emit(
        "group-cart-updated",
        {
          groupOrderId:
            group.group_order_id,

          groupCode:
            group.group_code,

          userId:
            Number(userId),

          itemId:
            Number(itemId),

          cartItemId,

          quantity: qty,
        }
      );
    }

    return res.json({
      success: true,
      message: `${item.name} added to shared cart`,
      cartItemId,
    });
  } catch (error) {
    console.error("❌ addGroupCartItem:", error);

    if (connection) {
      try {
        connection.release();
      } catch {}
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add item to group cart",
      error: error.message,
    });
  }
};

// ============================================================
// GET GROUP CART
// ============================================================

const getGroupCart = async (req, res) => {
  try {
    const { groupCode } = req.params;

    const [groups] = await db.query(
      `
      SELECT
        group_order_id,
        group_code,
        status
      FROM group_orders
      WHERE UPPER(group_code) = UPPER(?)
      LIMIT 1
      `,
      [String(groupCode).trim()]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groups[0];

    const [items] = await db.query(
      `
      SELECT
        gci.group_cart_item_id,
        gci.group_order_id,
        gci.user_id,
        gci.item_id,
        gci.quantity,
        gci.unit_price,

        u.name AS user_name,

        mi.name AS item_name,
        mi.image_url

      FROM group_cart_items gci

      JOIN users u
        ON u.user_id = gci.user_id

      JOIN menu_items mi
        ON mi.item_id = gci.item_id

      WHERE gci.group_order_id = ?

      ORDER BY gci.created_at ASC
      `,
      [group.group_order_id]
    );

    const total = items.reduce(
      (sum, item) =>
        sum +
        Number(item.unit_price) *
          Number(item.quantity),
      0
    );

    return res.json({
      success: true,
      groupCode: group.group_code,
      status: group.status,
      items,
      total: Number(total.toFixed(2)),
    });
  } catch (error) {
    console.error("❌ getGroupCart:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group cart",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE GROUP CART ITEM
// ============================================================

const updateGroupCartItem = async (req, res) => {
  try {
    const {
      groupCode,
      cartItemId,
    } = req.params;

    const {
      userId,
      quantity,
    } = req.body;

    const qty = Number(quantity);

    if (!userId || !cartItemId) {
      return res.status(400).json({
        success: false,
        message: "userId and cartItemId are required",
      });
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero",
      });
    }

    const [groups] = await db.query(
      `
      SELECT group_order_id, status
      FROM group_orders
      WHERE UPPER(group_code) = UPPER(?)
      LIMIT 1
      `,
      [String(groupCode).trim()]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (groups[0].status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message:
          "Cart can only be modified while the group is OPEN",
      });
    }

    const [result] = await db.query(
      `
      UPDATE group_cart_items
      SET quantity = ?
      WHERE group_cart_item_id = ?
      AND group_order_id = ?
      AND user_id = ?
      `,
      [
        qty,
        Number(cartItemId),
        groups[0].group_order_id,
        Number(userId),
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Cart item not found or you cannot modify this item",
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.to(
        `group-order-${groups[0].group_order_id}`
      ).emit(
        "group-cart-updated",
        {
          groupOrderId:
            groups[0].group_order_id,
        }
      );
    }

    return res.json({
      success: true,
      message: "Cart quantity updated",
    });
  } catch (error) {
    console.error("❌ updateGroupCartItem:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update cart item",
      error: error.message,
    });
  }
};

// ============================================================
// DELETE GROUP CART ITEM
// ============================================================

const deleteGroupCartItem = async (req, res) => {
  try {
    const {
      groupCode,
      cartItemId,
    } = req.params;

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const [groups] = await db.query(
      `
      SELECT group_order_id, status
      FROM group_orders
      WHERE UPPER(group_code) = UPPER(?)
      LIMIT 1
      `,
      [String(groupCode).trim()]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (groups[0].status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message:
          "Cart can only be modified while the group is OPEN",
      });
    }

    const [result] = await db.query(
      `
      DELETE FROM group_cart_items
      WHERE group_cart_item_id = ?
      AND group_order_id = ?
      AND user_id = ?
      `,
      [
        Number(cartItemId),
        groups[0].group_order_id,
        Number(userId),
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Cart item not found or you cannot delete this item",
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.to(
        `group-order-${groups[0].group_order_id}`
      ).emit(
        "group-cart-updated",
        {
          groupOrderId:
            groups[0].group_order_id,
        }
      );
    }

    return res.json({
      success: true,
      message: "Item removed from shared cart",
    });
  } catch (error) {
    console.error("❌ deleteGroupCartItem:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete cart item",
      error: error.message,
    });
  }
};

// ============================================================
// GET SPLIT BILL
// ============================================================

const getGroupSplitBill = async (req, res) => {
  try {
    const { groupCode } = req.params;

    const [groups] = await db.query(
      `
      SELECT
        go.group_order_id,
        go.group_code,
        go.status,
        go.restaurant_id,
        r.name AS restaurant_name
      FROM group_orders go
      JOIN restaurants r
        ON r.restaurant_id = go.restaurant_id
      WHERE UPPER(go.group_code) = UPPER(?)
      LIMIT 1
      `,
      [String(groupCode).trim()]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groups[0];

    // --------------------------------------------------------
    // MEMBERS
    // --------------------------------------------------------

    const [members] = await db.query(
      `
      SELECT
        gm.user_id,
        u.name,
        u.email
      FROM group_members gm
      JOIN users u
        ON u.user_id = gm.user_id
      WHERE gm.group_order_id = ?
      ORDER BY gm.joined_at ASC
      `,
      [group.group_order_id]
    );

    // --------------------------------------------------------
    // CART
    // --------------------------------------------------------

    const [cartItems] = await db.query(
      `
      SELECT
        gci.user_id,
        gci.item_id,
        gci.quantity,
        gci.unit_price,
        mi.name AS item_name
      FROM group_cart_items gci
      JOIN menu_items mi
        ON mi.item_id = gci.item_id
      WHERE gci.group_order_id = ?
      ORDER BY gci.created_at ASC
      `,
      [group.group_order_id]
    );

    // --------------------------------------------------------
    // PAYMENTS
    // --------------------------------------------------------

    const [payments] = await db.query(
      `
      SELECT
        group_payment_id,
        user_id,
        amount,
        payment_status,
        paid_at
      FROM group_payments
      WHERE group_order_id = ?
      ORDER BY group_payment_id ASC
      `,
      [group.group_order_id]
    );

    // --------------------------------------------------------
    // BUILD MEMBER SPLITS
    // --------------------------------------------------------

    const split = members.map(
      (member) => {
        const memberItems =
          cartItems.filter(
            (item) =>
              Number(item.user_id) ===
              Number(member.user_id)
          );

        const subtotal =
          memberItems.reduce(
            (sum, item) =>
              sum +
              Number(item.unit_price) *
                Number(item.quantity),
            0
          );

        const payment =
          payments.find(
            (p) =>
              Number(p.user_id) ===
              Number(member.user_id)
          );

        return {
          userId: Number(member.user_id),

          name: member.name,

          email: member.email,

          items: memberItems,

          subtotal: Number(
            subtotal.toFixed(2)
          ),

          payment: payment
            ? {
                paymentId:
                  payment.group_payment_id,

                amount: Number(
                  payment.amount
                ),

                status:
                  payment.payment_status,

                paidAt:
                  payment.paid_at,
              }
            : null,
        };
      }
    );

    const groupTotal =
      split.reduce(
        (sum, member) =>
          sum + Number(member.subtotal),
        0
      );

    const paidTotal =
      payments
        .filter(
          (p) =>
            p.payment_status === "PAID"
        )
        .reduce(
          (sum, p) =>
            sum + Number(p.amount),
          0
        );

    const pendingTotal =
      payments
        .filter(
          (p) =>
            p.payment_status === "PENDING"
        )
        .reduce(
          (sum, p) =>
            sum + Number(p.amount),
          0
        );

    return res.json({
      success: true,

      group: {
        ...group,

        total: Number(
          groupTotal.toFixed(2)
        ),
      },

      members: split,

      payments,

      summary: {
        groupTotal: Number(
          groupTotal.toFixed(2)
        ),

        paidTotal: Number(
          paidTotal.toFixed(2)
        ),

        pendingTotal: Number(
          pendingTotal.toFixed(2)
        ),

        totalMembers: members.length,

        paidMembers:
          payments.filter(
            (p) =>
              p.payment_status === "PAID"
          ).length,

        pendingMembers:
          payments.filter(
            (p) =>
              p.payment_status === "PENDING"
          ).length,
      },
    });
  } catch (error) {
    console.error("❌ getGroupSplitBill:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate split bill",
      error: error.message,
    });
  }
};

// ============================================================
// INITIALIZE DEMO PAYMENTS
// ============================================================

const initializeGroupPayments = async (req, res) => {
  let connection;

  try {
    const { groupCode } = req.params;

    connection = await db.getConnection();

    await connection.beginTransaction();

    // --------------------------------------------------------
    // GET GROUP
    // --------------------------------------------------------

    const [groups] = await connection.query(
      `
      SELECT
        group_order_id,
        group_code,
        status
      FROM group_orders
      WHERE UPPER(group_code) = UPPER(?)
      LIMIT 1
      `,
      [String(groupCode).trim()]
    );

    if (groups.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groups[0];

    // --------------------------------------------------------
    // ONLY OPEN GROUP CAN START CHECKOUT
    // --------------------------------------------------------

    if (group.status !== "OPEN") {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(400).json({
        success: false,
        message:
          `Cannot initialize payments because group is ${group.status}`,
      });
    }

    // --------------------------------------------------------
    // GET MEMBERS
    // --------------------------------------------------------

    const [members] = await connection.query(
      `
      SELECT user_id
      FROM group_members
      WHERE group_order_id = ?
      `,
      [group.group_order_id]
    );

    if (members.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(400).json({
        success: false,
        message: "Group has no members",
      });
    }

    // --------------------------------------------------------
    // GET CART
    // --------------------------------------------------------

    const [cartItems] =
      await connection.query(
        `
        SELECT
          user_id,
          quantity,
          unit_price
        FROM group_cart_items
        WHERE group_order_id = ?
        `,
        [group.group_order_id]
      );

    if (cartItems.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(400).json({
        success: false,
        message:
          "Add at least one item before checkout",
      });
    }

    // --------------------------------------------------------
    // CALCULATE MEMBER SUBTOTALS
    // --------------------------------------------------------

    const subtotals = {};

    members.forEach((member) => {
      subtotals[member.user_id] = 0;
    });

    cartItems.forEach((item) => {
      if (
        subtotals[item.user_id] !==
        undefined
      ) {
        subtotals[item.user_id] +=
          Number(item.unit_price) *
          Number(item.quantity);
      }
    });

    // --------------------------------------------------------
    // VALIDATE
    // --------------------------------------------------------

    const membersWithItems =
      members.filter(
        (member) =>
          Number(
            subtotals[member.user_id]
          ) > 0
      );

    if (membersWithItems.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(400).json({
        success: false,
        message:
          "No member has items in the shared cart",
      });
    }

    // --------------------------------------------------------
    // CREATE PAYMENT FOR EACH MEMBER WITH ITEMS
    // --------------------------------------------------------

    const createdPayments = [];

    for (const member of membersWithItems) {
      const amount =
        Number(
          subtotals[member.user_id]
        ).toFixed(2);

      const [existing] =
        await connection.query(
          `
          SELECT
            group_payment_id,
            payment_status
          FROM group_payments
          WHERE group_order_id = ?
          AND user_id = ?
          LIMIT 1
          `,
          [
            group.group_order_id,
            member.user_id,
          ]
        );

      if (existing.length > 0) {
        continue;
      }

      const [paymentResult] =
        await connection.query(
          `
          INSERT INTO group_payments
          (
            group_order_id,
            user_id,
            amount,
            payment_status
          )
          VALUES (?, ?, ?, 'PENDING')
          `,
          [
            group.group_order_id,
            member.user_id,
            amount,
          ]
        );

      createdPayments.push({
        group_payment_id:
          paymentResult.insertId,

        user_id:
          Number(member.user_id),

        amount:
          Number(amount),

        payment_status:
          "PENDING",
      });
    }

    // --------------------------------------------------------
    // CHANGE GROUP TO CHECKOUT
    // --------------------------------------------------------

    await connection.query(
      `
      UPDATE group_orders
      SET status = 'CHECKOUT'
      WHERE group_order_id = ?
      `,
      [group.group_order_id]
    );

    await connection.commit();

    connection.release();
    connection = null;

    // --------------------------------------------------------
    // SOCKET
    // --------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.to(
        `group-order-${group.group_order_id}`
      ).emit(
        "group-payment-initialized",
        {
          groupOrderId:
            group.group_order_id,

          groupCode:
            group.group_code,

          status: "CHECKOUT",

          payments:
            createdPayments,
        }
      );
    }

    // --------------------------------------------------------
    // GET TOTAL
    // --------------------------------------------------------

    const total =
      Object.values(subtotals)
        .reduce(
          (sum, value) =>
            sum + Number(value),
          0
        );

    return res.json({
      success: true,

      message:
        "Split bill initialized successfully",

      groupStatus: "CHECKOUT",

      total: Number(
        total.toFixed(2)
      ),

      payments:
        createdPayments,
    });
  } catch (error) {
    console.error(
      "❌ initializeGroupPayments:",
      error
    );

    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch {}
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to initialize group payments",
      error: error.message,
    });
  }
};

// ============================================================
// DEMO PAY MEMBER
// ============================================================

const demoPayGroupPayment = async (req, res) => {
  let connection;

  try {
    const {
      groupCode,
      paymentId,
    } = req.params;

    connection =
      await db.getConnection();

    await connection.beginTransaction();

    // --------------------------------------------------------
    // FIND GROUP
    // --------------------------------------------------------

    const [groups] =
      await connection.query(
        `
        SELECT
          group_order_id,
          group_code,
          status
        FROM group_orders
        WHERE UPPER(group_code) = UPPER(?)
        LIMIT 1
        `,
        [String(groupCode).trim()]
      );

    if (groups.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groups[0];

    if (
      group.status !== "CHECKOUT"
    ) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(400).json({
        success: false,
        message:
          `Payment is not available because group is ${group.status}`,
      });
    }

    // --------------------------------------------------------
    // FIND PAYMENT
    // --------------------------------------------------------

    const [payments] =
      await connection.query(
        `
        SELECT
          group_payment_id,
          group_order_id,
          user_id,
          amount,
          payment_status,
          paid_at
        FROM group_payments
        WHERE group_payment_id = ?
        AND group_order_id = ?
        LIMIT 1
        `,
        [
          Number(paymentId),
          group.group_order_id,
        ]
      );

    if (payments.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    const payment = payments[0];

    // --------------------------------------------------------
    // ALREADY PAID
    // --------------------------------------------------------

    if (
      payment.payment_status ===
      "PAID"
    ) {
      await connection.rollback();
      connection.release();
      connection = null;

      return res.json({
        success: true,
        demo: true,
        message:
          "Payment was already completed",
        payment,
        groupStatus: "CHECKOUT",
      });
    }

    // --------------------------------------------------------
    // MARK PAID
    // --------------------------------------------------------

    const demoTransactionId =
      `DEMO_${Date.now()}_${payment.group_payment_id}`;

    await connection.query(
      `
      UPDATE group_payments
      SET
        payment_status = 'PAID',
        paid_at = NOW()
      WHERE group_payment_id = ?
      `,
      [payment.group_payment_id]
    );

    // --------------------------------------------------------
    // CHECK PENDING PAYMENTS
    // --------------------------------------------------------

    const [pending] =
      await connection.query(
        `
        SELECT COUNT(*) AS count
        FROM group_payments
        WHERE group_order_id = ?
        AND payment_status = 'PENDING'
        `,
        [group.group_order_id]
      );

    const pendingCount =
      Number(pending[0].count);

    let finalGroupStatus =
      "CHECKOUT";

    if (pendingCount === 0) {
      await connection.query(
        `
        UPDATE group_orders
        SET status = 'PLACED'
        WHERE group_order_id = ?
        `,
        [group.group_order_id]
      );

      finalGroupStatus =
        "PLACED";
    }

    await connection.commit();

    connection.release();
    connection = null;

    // --------------------------------------------------------
    // SOCKET
    // --------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.to(
        `group-order-${group.group_order_id}`
      ).emit(
        "group-payment-updated",
        {
          groupOrderId:
            group.group_order_id,

          groupCode:
            group.group_code,

          paymentId:
            Number(paymentId),

          userId:
            Number(payment.user_id),

          paymentStatus:
            "PAID",

          groupStatus:
            finalGroupStatus,

          pendingPayments:
            pendingCount,

          demoTransactionId,
        }
      );
    }

    return res.json({
      success: true,

      demo: true,

      message:
        "Demo payment successful",

      demoTransactionId,

      payment: {
        paymentId:
          payment.group_payment_id,

        userId:
          payment.user_id,

        amount:
          Number(payment.amount),

        paymentStatus:
          "PAID",
      },

      groupStatus:
        finalGroupStatus,

      pendingPayments:
        pendingCount,
    });
  } catch (error) {
    console.error(
      "❌ demoPayGroupPayment:",
      error
    );

    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch {}
    }

    return res.status(500).json({
      success: false,
      message:
        "Demo payment failed",
      error: error.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
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
};