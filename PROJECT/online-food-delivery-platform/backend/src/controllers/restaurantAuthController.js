const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const RESTAURANT_EMAIL = "restaurant@gmail.com";
const RESTAURANT_PASSWORD = "123456";

const restaurantLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (
      email.toLowerCase() !== RESTAURANT_EMAIL ||
      password !== RESTAURANT_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid restaurant credentials",
      });
    }

    const token = jwt.sign(
      {
        email: RESTAURANT_EMAIL,
        role: "RESTAURANT_MANAGER",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      message: "Restaurant login successful",
      token,
      restaurantUser: {
        email: RESTAURANT_EMAIL,
        role: "RESTAURANT_MANAGER",
        name: "FoodFlow Restaurant Manager",
      },
    });
  } catch (error) {
    console.error("Restaurant login error:", error);

    res.status(500).json({
      success: false,
      message: "Restaurant login failed",
    });
  }
};

module.exports = {
  restaurantLogin,
};