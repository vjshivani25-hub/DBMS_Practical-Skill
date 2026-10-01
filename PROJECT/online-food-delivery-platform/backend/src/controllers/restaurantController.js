const db = require("../config/db");

// GET ALL RESTAURANTS
const getRestaurants = async (req, res) => {
  try {
    const [restaurants] = await db.query(`
      SELECT
        restaurant_id,
        owner_id,
        name,
        description,
        address,
        city,
        latitude,
        longitude,
        rating,
        delivery_fee,
        is_open,
        created_at
      FROM restaurants
      ORDER BY restaurant_id DESC
    `);

    res.json({
      success: true,
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error("Get restaurants error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch restaurants",
    });
  }
};

// GET RESTAURANT BY ID
const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;

    const [restaurants] = await db.query(
      `
      SELECT
        restaurant_id,
        owner_id,
        name,
        description,
        address,
        city,
        latitude,
        longitude,
        rating,
        delivery_fee,
        is_open,
        created_at
      FROM restaurants
      WHERE restaurant_id = ?
      `,
      [id]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.json({
      success: true,
      restaurant: restaurants[0],
    });
  } catch (error) {
    console.error("Get restaurant error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch restaurant",
    });
  }
};

module.exports = {
  getRestaurants,
  getRestaurantById,
};