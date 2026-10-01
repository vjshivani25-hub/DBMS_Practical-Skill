const db = require("../config/db");

// ============================================================
// GET USER ADDRESSES
// ============================================================

const getUserAddresses = async (req, res) => {
  try {
    const { userId } = req.params;

    const [addresses] = await db.query(
      `
      SELECT
        address_id,
        user_id,
        address_line,
        city,
        state,
        pincode,
        latitude,
        longitude
      FROM addresses
      WHERE user_id = ?
      ORDER BY address_id DESC
      `,
      [userId]
    );

    res.json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error("Get addresses error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
    });
  }
};

// ============================================================
// CREATE ADDRESS
// ============================================================

const createAddress = async (req, res) => {
  try {
    const {
      user_id,
      address_line,
      city,
      state,
      pincode,
      latitude,
      longitude,
    } = req.body;

    if (
      !user_id ||
      !address_line ||
      !city ||
      !state ||
      !pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required address details",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO addresses
      (
        user_id,
        address_line,
        city,
        state,
        pincode,
        latitude,
        longitude
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id,
        address_line,
        city,
        state,
        pincode,
        latitude || null,
        longitude || null,
      ]
    );

    const [rows] = await db.query(
      `
      SELECT
        address_id,
        user_id,
        address_line,
        city,
        state,
        pincode,
        latitude,
        longitude
      FROM addresses
      WHERE address_id = ?
      `,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: rows[0],
    });
  } catch (error) {
    console.error("Create address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create address",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getUserAddresses,
  createAddress,
};