const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

dotenv.config();

// ============================================================
// ROUTES
// ============================================================

const authRoutes = require("./routes/authRoutes");
const restaurantAuthRoutes = require("./routes/restaurantAuthRoutes");
const deliveryPartnerRoutes = require("./routes/deliveryPartnerRoutes");
const groupOrderRoutes = require("./routes/groupOrderRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");

// ============================================================
// EXPRESS APP
// ============================================================

const app = express();

// ============================================================
// HTTP SERVER
// ============================================================

const server = http.createServer(app);

// ============================================================
// SOCKET.IO
// ============================================================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ],
    credentials: true,
  },
});

// Make Socket.IO available inside controllers
app.set("io", io);

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ],
    credentials: true,
  })
);

app.use(express.json());

// ============================================================
// API ROUTES
// ============================================================

// ------------------------------------------------------------
// CUSTOMER AUTH
// ------------------------------------------------------------

app.use(
  "/api/auth",
  authRoutes
);

// ------------------------------------------------------------
// RESTAURANT AUTH
// ------------------------------------------------------------

app.use(
  "/api/restaurant-auth",
  restaurantAuthRoutes
);

// ------------------------------------------------------------
// DELIVERY PARTNER
// ------------------------------------------------------------

app.use(
  "/api/delivery-partners",
  deliveryPartnerRoutes
);

app.use("/api/group-orders", groupOrderRoutes);
// ------------------------------------------------------------
// RESTAURANTS
// ------------------------------------------------------------

app.use(
  "/api/restaurants",
  restaurantRoutes
);

// ------------------------------------------------------------
// MENU
// ------------------------------------------------------------

app.use(
  "/api/menu",
  menuRoutes
);

// ------------------------------------------------------------
// ORDERS
// ------------------------------------------------------------

app.use(
  "/api/orders",
  orderRoutes
);

// ------------------------------------------------------------
// ADDRESSES
// ------------------------------------------------------------

app.use(
  "/api/addresses",
  addressRoutes
);

// ============================================================
// BASIC ROUTE
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FoodFlow Backend is running 🚀",
    version: "1.0.0",
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FoodFlow API is healthy ❤️",
    timestamp: new Date(),
  });
});

// ============================================================
// SOCKET.IO
// ============================================================

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // ==========================================================
  // JOIN ORDER ROOM
  // ==========================================================

  socket.on("join-order", (orderId) => {
    if (!orderId) {
      return;
    }

    const roomName = `order-${orderId}`;

    socket.join(roomName);

    console.log(
      `📦 Socket ${socket.id} joined ${roomName}`
    );
  });

  // ==========================================================
  // LEAVE ORDER ROOM
  // ==========================================================

  socket.on("leave-order", (orderId) => {
    if (!orderId) {
      return;
    }

    const roomName = `order-${orderId}`;

    socket.leave(roomName);

    console.log(
      `📤 Socket ${socket.id} left ${roomName}`
    );
  });

  // ==========================================================
  // ORDER STATUS UPDATE
  // ==========================================================

  socket.on("order-status-update", (data) => {
    if (
      !data ||
      !data.orderId ||
      !data.status
    ) {
      return;
    }

    const roomName = `order-${data.orderId}`;

    console.log(
      `📢 Order ${data.orderId} status: ${data.status}`
    );

    io.to(roomName).emit(
      "order-status-updated",
      {
        orderId: Number(data.orderId),
        status: data.status,
        timestamp: new Date(),
      }
    );
  });

  // ==========================================================
  // DELIVERY LOCATION UPDATE
  // ==========================================================

  socket.on(
    "delivery-location-update",
    (data) => {
      if (
        !data ||
        !data.orderId ||
        data.latitude === undefined ||
        data.longitude === undefined
      ) {
        return;
      }

      const roomName =
        `order-${data.orderId}`;

      console.log(
        `📍 Delivery location updated for order ${data.orderId}`
      );

      io.to(roomName).emit(
        "delivery-location-updated",
        {
          orderId: Number(data.orderId),
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          timestamp: new Date(),
        }
      );
    }
  );

  // ==========================================================
  // GROUP ORDER ROOM
  // ==========================================================

  socket.on(
    "join-group-order",
    (groupOrderId) => {
      if (!groupOrderId) {
        return;
      }

      const roomName =
        `group-order-${groupOrderId}`;

      socket.join(roomName);

      console.log(
        `👥 Socket ${socket.id} joined ${roomName}`
      );
    }
  );

  // ==========================================================
  // GROUP ORDER UPDATE
  // ==========================================================

  socket.on(
    "group-order-update",
    (data) => {
      if (
        !data ||
        !data.groupOrderId
      ) {
        return;
      }

      const roomName =
        `group-order-${data.groupOrderId}`;

      io.to(roomName).emit(
        "group-order-updated",
        {
          ...data,
          timestamp: new Date(),
        }
      );
    }
  );

  // ==========================================================
  // DISCONNECT
  // ==========================================================

  socket.on("disconnect", () => {
    console.log(
      "🔌 User disconnected:",
      socket.id
    );
  });
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (err, req, res, next) => {
    console.error(
      "❌ Server Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

const PORT =
  process.env.PORT || 5000;

server.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      "============================================"
    );
    console.log(
      "🚀 FOODFLOW BACKEND SERVER"
    );
    console.log(
      "============================================"
    );

    console.log(
      `🌐 Server: http://localhost:${PORT}`
    );

    console.log(
      `❤️ Health: http://localhost:${PORT}/api/health`
    );

    console.log(
      `👤 Customer Auth: http://localhost:${PORT}/api/auth`
    );

    console.log(
      `🏪 Restaurant Auth: http://localhost:${PORT}/api/restaurant-auth`
    );

    console.log(
      `🚴 Delivery Partner: http://localhost:${PORT}/api/delivery-partners`
    );

    console.log(
      `🍽️ Restaurants: http://localhost:${PORT}/api/restaurants`
    );

    console.log(
      `🍔 Menu: http://localhost:${PORT}/api/menu`
    );

    console.log(
      `📦 Orders: http://localhost:${PORT}/api/orders`
    );

    console.log(
      `📍 Addresses: http://localhost:${PORT}/api/addresses`
    );
    console.log("👥 Group Orders: http://localhost:5000/api/group-orders");

    console.log(
      "🔴 Socket.IO: Enabled"
    );

    console.log(
      "============================================"
    );

    console.log("");
  }
);