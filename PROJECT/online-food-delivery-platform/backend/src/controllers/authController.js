const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ============================================================
// REGISTER USER
// ============================================================

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = "CUSTOMER",
    } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !name ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, phone and password are required",
      });
    }

    // --------------------------------------------------------
    // CHECK EMAIL
    // --------------------------------------------------------

    const [existingEmail] =
      await db.query(
        `
        SELECT user_id
        FROM users
        WHERE email = ?
        `,
        [email]
      );

    if (
      existingEmail.length > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Email already registered",
      });
    }

    // --------------------------------------------------------
    // CHECK PHONE
    // --------------------------------------------------------

    const [existingPhone] =
      await db.query(
        `
        SELECT user_id
        FROM users
        WHERE phone = ?
        `,
        [phone]
      );

    if (
      existingPhone.length > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Phone number already registered",
      });
    }

    // --------------------------------------------------------
    // HASH PASSWORD
    // --------------------------------------------------------

    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );

    // --------------------------------------------------------
    // INSERT USER
    // --------------------------------------------------------

    const [result] =
      await db.query(
        `
        INSERT INTO users
        (
          name,
          email,
          phone,
          password_hash,
          role
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          name,
          email,
          phone,
          passwordHash,
          role,
        ]
      );

    // --------------------------------------------------------
    // DELIVERY PARTNER AUTO PROFILE
    // --------------------------------------------------------

    let deliveryPartner =
      null;

    if (
      role ===
      "DELIVERY_PARTNER"
    ) {
      const [partnerResult] =
        await db.query(
          `
          INSERT INTO delivery_partners
          (
            user_id,
            vehicle_type,
            vehicle_number,
            availability_status
          )
          VALUES (?, ?, ?, ?)
          `,
          [
            result.insertId,
            "Bike",
            null,
            "AVAILABLE",
          ]
        );

      deliveryPartner = {
        partner_id:
          partnerResult.insertId,
        user_id:
          result.insertId,
        vehicle_type:
          "Bike",
        vehicle_number:
          null,
        availability_status:
          "AVAILABLE",
      };
    }

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    res.status(201).json({
      success: true,
      message:
        "User registered successfully",

      user: {
        user_id:
          result.insertId,
        name,
        email,
        phone,
        role,
      },

      delivery_partner:
        deliveryPartner,
    });
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error during registration",
    });
  }
};

// ============================================================
// LOGIN USER
// ============================================================

const loginUser = async (
  req,
  res
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    // --------------------------------------------------------
    // FIND USER
    // --------------------------------------------------------

    const [users] =
      await db.query(
        `
        SELECT
          user_id,
          name,
          email,
          phone,
          password_hash,
          role
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [email]
      );

    if (
      users.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    const user =
      users[0];

    // --------------------------------------------------------
    // PASSWORD CHECK
    // --------------------------------------------------------

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // --------------------------------------------------------
    // DELIVERY PARTNER DETAILS
    // --------------------------------------------------------

    let deliveryPartner =
      null;

    if (
      user.role ===
      "DELIVERY_PARTNER"
    ) {
      const [
        partnerRows,
      ] = await db.query(
        `
        SELECT
          partner_id,
          user_id,
          vehicle_type,
          vehicle_number,
          availability_status,
          current_latitude,
          current_longitude
        FROM delivery_partners
        WHERE user_id = ?
        LIMIT 1
        `,
        [user.user_id]
      );

      if (
        partnerRows.length >
        0
      ) {
        deliveryPartner =
          partnerRows[0];
      }
    }

    // --------------------------------------------------------
    // JWT
    // --------------------------------------------------------

    const token =
      jwt.sign(
        {
          user_id:
            user.user_id,
          email:
            user.email,
          role:
            user.role,
        },
        process.env
          .JWT_SECRET,
        {
          expiresIn:
            "7d",
        }
      );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    res.json({
      success: true,
      message:
        "Login successful",

      token,

      user: {
        user_id:
          user.user_id,
        name:
          user.name,
        email:
          user.email,
        phone:
          user.phone,
        role:
          user.role,
      },

      delivery_partner:
        deliveryPartner,
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error during login",
    });
  }
};

// ============================================================
// GET ALL USERS
// ============================================================

const getUsers = async (
  req,
  res
) => {
  try {
    const [users] =
      await db.query(
        `
        SELECT
          user_id,
          name,
          email,
          phone,
          role,
          created_at
        FROM users
        ORDER BY user_id DESC
        `
      );

    res.json({
      success: true,
      count:
        users.length,
      users,
    });
  } catch (error) {
    console.error(
      "Get users error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch users",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  registerUser,
  loginUser,
  getUsers,
};