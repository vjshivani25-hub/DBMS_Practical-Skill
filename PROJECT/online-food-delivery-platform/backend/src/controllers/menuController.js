const db = require("../config/db");

// GET ALL MENU ITEMS
const getAllMenuItems = async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT
        m.item_id,
        m.restaurant_id,
        r.name AS restaurant_name,
        m.category_id,
        c.name AS category_name,
        m.name,
        m.description,
        m.price,
        m.image_url,
        m.is_available
      FROM menu_items m
      JOIN restaurants r
        ON m.restaurant_id = r.restaurant_id
      LEFT JOIN categories c
        ON m.category_id = c.category_id
      ORDER BY m.restaurant_id, m.item_id
    `);

    res.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Get menu items error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch menu items",
    });
  }
};


// GET MENU FOR ONE RESTAURANT
const getMenuByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const [items] = await db.query(
      `
      SELECT
        m.item_id,
        m.restaurant_id,
        r.name AS restaurant_name,
        m.category_id,
        c.name AS category_name,
        m.name,
        m.description,
        m.price,
        m.image_url,
        m.is_available
      FROM menu_items m
      JOIN restaurants r
        ON m.restaurant_id = r.restaurant_id
      LEFT JOIN categories c
        ON m.category_id = c.category_id
      WHERE m.restaurant_id = ?
      ORDER BY m.item_id
      `,
      [restaurantId]
    );

    res.json({
      success: true,
      restaurant_id: Number(restaurantId),
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Get restaurant menu error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch restaurant menu",
    });
  }
};


// GET SINGLE MENU ITEM
const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const [items] = await db.query(
      `
      SELECT
        m.item_id,
        m.restaurant_id,
        r.name AS restaurant_name,
        m.category_id,
        c.name AS category_name,
        m.name,
        m.description,
        m.price,
        m.image_url,
        m.is_available
      FROM menu_items m
      JOIN restaurants r
        ON m.restaurant_id = r.restaurant_id
      LEFT JOIN categories c
        ON m.category_id = c.category_id
      WHERE m.item_id = ?
      `,
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.json({
      success: true,
      item: items[0],
    });
  } catch (error) {
    console.error("Get menu item error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch menu item",
    });
  }
};


module.exports = {
  getAllMenuItems,
  getMenuByRestaurant,
  getMenuItemById,
};