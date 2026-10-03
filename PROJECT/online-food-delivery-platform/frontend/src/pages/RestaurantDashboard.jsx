import { useEffect, useMemo, useState } from "react";

import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  LogOut,
  RefreshCw,
  Clock3,
  CheckCircle2,
  ChefHat,
  Truck,
  Star,
  MapPin,
  Package,
  IndianRupee,
  AlertCircle,
  History,
  Layers3,
  Phone,
  Utensils,
} from "lucide-react";

import "./RestaurantDashboard.css";

import {
  getRestaurants,
  getRestaurantOrders,
  updateOrderStatus,
} from "../services/api";

// ============================================================
// RESTAURANT IMAGES
// ============================================================

const RESTAURANT_IMAGES = {
  "Paradise Biryani":
    "https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=900&q=85",

  "Pizza Palace":
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85",

  "Burger House":
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85",

  "Spice Garden":
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85",

  "Bawarchi Restaurant":
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=85",

  "Urban Tadka":
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",

  "Dragon Wok":
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85",

  "Sweet Truth":
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85",

  "Dosa Corner":
    "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=85",

  "Cafe Mocha":
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=85",
};

const FALLBACK_RESTAURANT_IMAGE =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=85";

// ============================================================
// RESTAURANT CONTROLLED STATUSES
// ============================================================

const RESTAURANT_STATUSES = [
  {
    key: "CONFIRMED",
    label: "Confirm Order",
    shortLabel: "Confirmed",
    icon: CheckCircle2,
  },
  {
    key: "PREPARING",
    label: "Start Preparing",
    shortLabel: "Preparing",
    icon: ChefHat,
  },
  {
    key: "READY_FOR_PICKUP",
    label: "Ready for Pickup",
    shortLabel: "Ready",
    icon: Truck,
  },
];

// ============================================================
// ACTIVE STATUS LIST
// ============================================================

const ACTIVE_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
];

// ============================================================
// OLD STATUS LIST
// ============================================================

const OLD_STATUSES = [
  "DELIVERED",
  "CANCELLED",
];

// ============================================================
// COMPONENT
// ============================================================

function RestaurantDashboard({ onLogout }) {
  // ==========================================================
  // VIEW
  // ==========================================================

  const [activeView, setActiveView] =
    useState("dashboard");

  const [orderTab, setOrderTab] =
    useState("active");

  // ==========================================================
  // RESTAURANTS
  // ==========================================================

  const [restaurants, setRestaurants] =
    useState([]);

  const [selectedRestaurant, setSelectedRestaurant] =
    useState(null);

  const [loadingRestaurants, setLoadingRestaurants] =
    useState(true);

  const [restaurantError, setRestaurantError] =
    useState("");

  // ==========================================================
  // ORDERS
  // ==========================================================

  const [restaurantOrders, setRestaurantOrders] =
    useState([]);

  const [loadingOrders, setLoadingOrders] =
    useState(false);

  const [ordersError, setOrdersError] =
    useState("");

  const [updatingOrderId, setUpdatingOrderId] =
    useState(null);

  const [refreshing, setRefreshing] =
    useState(false);

  // ==========================================================
  // LOAD RESTAURANTS
  // ==========================================================

  const loadRestaurants = async () => {
    try {
      setLoadingRestaurants(true);
      setRestaurantError("");

      const data = await getRestaurants();

      if (data.success) {
        const list =
          data.restaurants || [];

        setRestaurants(list);

        setSelectedRestaurant(
          (current) => {
            if (current) {
              const updated =
                list.find(
                  (restaurant) =>
                    Number(
                      restaurant.restaurant_id
                    ) ===
                    Number(
                      current.restaurant_id
                    )
                );

              return updated || current;
            }

            return list.length > 0
              ? list[0]
              : null;
          }
        );
      } else {
        setRestaurantError(
          data.message ||
            "Failed to load restaurants."
        );
      }
    } catch (error) {
      console.error(
        "Restaurant loading error:",
        error
      );

      setRestaurantError(
        "Unable to connect to FoodFlow backend."
      );
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // ==========================================================
  // LOAD RESTAURANT ORDERS
  // ==========================================================

  const loadRestaurantOrders = async (
    restaurantId,
    showRefresh = false
  ) => {
    if (!restaurantId) return;

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoadingOrders(true);
      }

      setOrdersError("");

      const data =
        await getRestaurantOrders(
          restaurantId
        );

      if (data.success) {
        setRestaurantOrders(
          data.orders || []
        );
      } else {
        setOrdersError(
          data.message ||
            "Failed to load orders."
        );
      }
    } catch (error) {
      console.error(
        "Restaurant orders error:",
        error
      );

      setOrdersError(
        "Unable to load restaurant orders."
      );
    } finally {
      setLoadingOrders(false);
      setRefreshing(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadRestaurants();
  }, []);

  // ==========================================================
  // LOAD ORDERS WHEN RESTAURANT CHANGES
  // ==========================================================

  useEffect(() => {
    if (!selectedRestaurant) {
      setRestaurantOrders([]);
      return;
    }

    loadRestaurantOrders(
      selectedRestaurant.restaurant_id
    );
  }, [selectedRestaurant]);

  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    if (
      !selectedRestaurant ||
      activeView !== "orders"
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        loadRestaurantOrders(
          selectedRestaurant.restaurant_id,
          true
        );
      }, 10000);

    return () =>
      clearInterval(interval);
  }, [
    selectedRestaurant,
    activeView,
  ]);

  // ==========================================================
  // SELECT RESTAURANT
  // ==========================================================

  const selectRestaurant = (
    restaurant
  ) => {
    setSelectedRestaurant(
      restaurant
    );

    setOrderTab("active");

    setActiveView("orders");
  };

  // ==========================================================
  // ORDER FILTERS
  // ==========================================================

  const activeOrders = useMemo(() => {
    return restaurantOrders.filter(
      (order) =>
        ACTIVE_STATUSES.includes(
          order.status
        )
    );
  }, [restaurantOrders]);

  const oldOrders = useMemo(() => {
    return restaurantOrders.filter(
      (order) =>
        OLD_STATUSES.includes(
          order.status
        )
    );
  }, [restaurantOrders]);

  const allOrders = useMemo(() => {
    return [...restaurantOrders].sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );
  }, [restaurantOrders]);

  const displayedOrders =
    useMemo(() => {
      if (orderTab === "old") {
        return oldOrders;
      }

      if (orderTab === "all") {
        return allOrders;
      }

      return activeOrders;
    }, [
      orderTab,
      activeOrders,
      oldOrders,
      allOrders,
    ]);

  // ==========================================================
  // UPDATE ORDER STATUS
  // ==========================================================

  const changeOrderStatus = async (
    orderId,
    status
  ) => {
    try {
      setUpdatingOrderId(orderId);
      setOrdersError("");

      const currentOrder =
        restaurantOrders.find(
          (order) =>
            Number(order.order_id) ===
            Number(orderId)
        );

      if (!currentOrder) {
        return;
      }

      // ------------------------------------------------------
      // RESTAURANT ROLE PROTECTION
      // ------------------------------------------------------

      const allowedTransitions = {
        PLACED: "CONFIRMED",
        CONFIRMED: "PREPARING",
        PREPARING: "READY_FOR_PICKUP",
      };

      const expectedNextStatus =
        allowedTransitions[
          currentOrder.status
        ];

      if (
        expectedNextStatus !==
        status
      ) {
        setOrdersError(
          `Restaurant cannot move this order from ${formatStatus(
            currentOrder.status
          )} to ${formatStatus(status)}.`
        );

        return;
      }

      // ------------------------------------------------------
      // API UPDATE
      // ------------------------------------------------------

      const data =
        await updateOrderStatus(
          orderId,
          status
        );

      if (!data.success) {
        setOrdersError(
          data.message ||
            "Failed to update order status."
        );

        return;
      }

      // ------------------------------------------------------
      // UPDATE UI
      // ------------------------------------------------------

      setRestaurantOrders(
        (currentOrders) =>
          currentOrders.map(
            (order) =>
              Number(
                order.order_id
              ) === Number(orderId)
                ? {
                    ...order,
                    status,
                  }
                : order
          )
      );
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      setOrdersError(
        "Unable to update order status."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ==========================================================
  // STATUS FORMAT
  // ==========================================================

  const formatStatus = (status) => {
    if (!status) {
      return "Placed";
    }

    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  // ==========================================================
  // DATE FORMAT
  // ==========================================================

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(
      date
    ).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // ==========================================================
  // RESTAURANT IMAGE
  // ==========================================================

  const getRestaurantImage = (
    restaurant
  ) => {
    return (
      RESTAURANT_IMAGES[
        restaurant?.name
      ] ||
      restaurant?.image_url ||
      FALLBACK_RESTAURANT_IMAGE
    );
  };

  // ==========================================================
  // DASHBOARD STATISTICS
  // ==========================================================

  const dashboardStats = useMemo(() => {
    const totalOrders =
      restaurantOrders.length;

    const active =
      restaurantOrders.filter(
        (order) =>
          ACTIVE_STATUSES.includes(
            order.status
          )
      ).length;

    const delivered =
      restaurantOrders.filter(
        (order) =>
          order.status ===
          "DELIVERED"
      ).length;

    const revenue =
      restaurantOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.total_amount || 0
          ),
        0
      );

    return {
      totalOrders,
      activeOrders: active,
      delivered,
      revenue,
    };
  }, [restaurantOrders]);

  // ==========================================================
  // STATUS CLASS
  // ==========================================================

  const statusClass = (status) => {
    switch (status) {
      case "PLACED":
        return "status-placed";

      case "CONFIRMED":
        return "status-confirmed";

      case "PREPARING":
        return "status-preparing";

      case "READY_FOR_PICKUP":
        return "status-ready";

      case "OUT_FOR_DELIVERY":
        return "status-out";

      case "DELIVERED":
        return "status-delivered";

      case "CANCELLED":
        return "status-cancelled";

      default:
        return "";
    }
  };

  // ==========================================================
  // CAN RESTAURANT UPDATE?
  // ==========================================================

  const canUpdateStatus = (
    currentStatus,
    targetStatus
  ) => {
    const transitions = {
      PLACED: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "READY_FOR_PICKUP",
    };

    return (
      transitions[
        currentStatus
      ] === targetStatus
    );
  };

  // ==========================================================
  // PAGE TITLE
  // ==========================================================

  const pageTitle =
    activeView === "dashboard"
      ? "Dashboard"
      : activeView === "orders"
      ? "Orders"
      : "Restaurants";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="restaurant-dashboard-page">

      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <aside className="restaurant-sidebar">

        <div className="restaurant-brand">

          <div className="brand-logo">
            F
          </div>

          <div>
            <strong>
              FoodFlow
            </strong>

            <span>
              Restaurant Partner
            </span>
          </div>

        </div>

        <nav className="restaurant-sidebar-nav">

          <button
            className={
              activeView === "dashboard"
                ? "sidebar-nav-item active"
                : "sidebar-nav-item"
            }
            onClick={() =>
              setActiveView(
                "dashboard"
              )
            }
          >
            <LayoutDashboard
              size={19}
            />

            <span>
              Dashboard
            </span>
          </button>

          <button
            className={
              activeView === "orders"
                ? "sidebar-nav-item active"
                : "sidebar-nav-item"
            }
            onClick={() =>
              setActiveView("orders")
            }
          >
            <ShoppingBag
              size={19}
            />

            <span>
              Orders
            </span>

            {activeOrders.length >
              0 && (
              <b className="sidebar-count">
                {activeOrders.length}
              </b>
            )}
          </button>

          <button
            className={
              activeView ===
              "restaurants"
                ? "sidebar-nav-item active"
                : "sidebar-nav-item"
            }
            onClick={() =>
              setActiveView(
                "restaurants"
              )
            }
          >
            <Store size={19} />

            <span>
              Restaurants
            </span>
          </button>

        </nav>

        <div className="restaurant-sidebar-bottom">

          <div className="partner-profile">

            <div className="partner-avatar">
              F
            </div>

            <div>
              <strong>
                FoodFlow Restaurant
              </strong>

              <span>
                restaurant@gmail.com
              </span>
            </div>

          </div>

          <button
            className="restaurant-logout-button"
            onClick={onLogout}
          >
            <LogOut size={17} />

            Logout
          </button>

        </div>

      </aside>

      {/* ====================================================
          MAIN
      ==================================================== */}

      <main className="restaurant-dashboard-main">

        {/* HEADER */}

        <header className="restaurant-dashboard-header">

          <div>
            <p>
              RESTAURANT PARTNER
            </p>

            <h1>
              {pageTitle}
            </h1>
          </div>

          <button
            className="dashboard-refresh"
            onClick={() => {
              loadRestaurants();

              if (
                selectedRestaurant
              ) {
                loadRestaurantOrders(
                  selectedRestaurant.restaurant_id,
                  true
                );
              }
            }}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            Refresh
          </button>

        </header>

        {/* ==================================================
            DASHBOARD
        ================================================== */}

        {activeView ===
          "dashboard" && (
          <section className="dashboard-view">

            <div className="welcome-card">

              <div>
                <p>
                  FOODFLOW PARTNER CENTER
                </p>

                <h2>
                  Manage your
                  restaurants &
                  orders
                </h2>

                <span>
                  Confirm orders,
                  prepare food and
                  hand them over to
                  delivery partners.
                </span>
              </div>

              <div className="welcome-icon">
                <Store size={45} />
              </div>

            </div>

            {/* STATS */}

            <div className="dashboard-stat-grid">

              <div className="dashboard-stat-card">

                <div className="stat-icon orders">
                  <ShoppingBag
                    size={21}
                  />
                </div>

                <div>
                  <span>
                    Total Orders
                  </span>

                  <strong>
                    {
                      dashboardStats.totalOrders
                    }
                  </strong>
                </div>

              </div>

              <div className="dashboard-stat-card">

                <div className="stat-icon active">
                  <Clock3
                    size={21}
                  />
                </div>

                <div>
                  <span>
                    Active Orders
                  </span>

                  <strong>
                    {
                      dashboardStats.activeOrders
                    }
                  </strong>
                </div>

              </div>

              <div className="dashboard-stat-card">

                <div className="stat-icon delivered">
                  <CheckCircle2
                    size={21}
                  />
                </div>

                <div>
                  <span>
                    Delivered
                  </span>

                  <strong>
                    {
                      dashboardStats.delivered
                    }
                  </strong>
                </div>

              </div>

              <div className="dashboard-stat-card">

                <div className="stat-icon revenue">
                  <IndianRupee
                    size={21}
                  />
                </div>

                <div>
                  <span>
                    Order Value
                  </span>

                  <strong>
                    ₹
                    {dashboardStats.revenue.toFixed(
                      0
                    )}
                  </strong>
                </div>

              </div>

            </div>

            {/* QUICK ACTIONS */}

            <div className="dashboard-section">

              <div className="dashboard-section-header">

                <div>
                  <p>
                    QUICK ACTIONS
                  </p>

                  <h2>
                    Restaurant
                    Management
                  </h2>
                </div>

              </div>

              <div className="quick-action-grid">

                <button
                  onClick={() => {
                    setOrderTab(
                      "active"
                    );
                    setActiveView(
                      "orders"
                    );
                  }}
                >
                  <ShoppingBag
                    size={25}
                  />

                  <strong>
                    View Active Orders
                  </strong>

                  <span>
                    Manage incoming
                    restaurant orders
                  </span>
                </button>

                <button
                  onClick={() => {
                    setOrderTab("old");
                    setActiveView(
                      "orders"
                    );
                  }}
                >
                  <History size={25} />

                  <strong>
                    Order History
                  </strong>

                  <span>
                    View completed and
                    cancelled orders
                  </span>
                </button>

                <button
                  onClick={() =>
                    setActiveView(
                      "restaurants"
                    )
                  }
                >
                  <Store size={25} />

                  <strong>
                    View Restaurants
                  </strong>

                  <span>
                    Select a restaurant
                    to manage
                  </span>
                </button>

              </div>

            </div>

            {/* ROLE */}

            <div className="restaurant-role-card">

              <div className="role-icon">
                <ChefHat size={25} />
              </div>

              <div className="role-content">

                <h3>
                  Restaurant Partner
                  Role
                </h3>

                <p>
                  Restaurant controls
                  only the kitchen and
                  handoff stages.
                </p>

                <div className="role-flow">

                  <span>
                    Order Placed
                  </span>

                  <b>→</b>

                  <span>
                    Confirmed
                  </span>

                  <b>→</b>

                  <span>
                    Preparing
                  </span>

                  <b>→</b>

                  <span>
                    Ready for Pickup
                  </span>

                  <b>→</b>

                  <span>
                    Delivery Partner
                  </span>

                </div>

                <small>
                  Delivery Partner
                  handles Out for
                  Delivery → Delivered.
                </small>

              </div>

            </div>

          </section>
        )}

        {/* ==================================================
            RESTAURANTS
        ================================================== */}

        {activeView ===
          "restaurants" && (
          <section className="restaurants-view">

            <div className="section-heading-row">

              <div>
                <p>
                  YOUR RESTAURANTS
                </p>

                <h2>
                  Select a restaurant
                </h2>

                <span>
                  Choose a restaurant
                  to view and manage
                  its orders.
                </span>
              </div>

              <div className="restaurant-count">
                {restaurants.length}{" "}
                Restaurants
              </div>

            </div>

            {restaurantError && (
              <div className="dashboard-error">
                <AlertCircle
                  size={18}
                />

                {restaurantError}
              </div>
            )}

            {loadingRestaurants ? (
              <div className="dashboard-loading">
                Loading restaurants...
              </div>
            ) : (
              <div className="restaurant-management-grid">

                {restaurants.map(
                  (restaurant) => (
                    <button
                      key={
                        restaurant.restaurant_id
                      }
                      className={
                        Number(
                          selectedRestaurant?.restaurant_id
                        ) ===
                        Number(
                          restaurant.restaurant_id
                        )
                          ? "management-restaurant-card selected"
                          : "management-restaurant-card"
                      }
                      onClick={() =>
                        selectRestaurant(
                          restaurant
                        )
                      }
                    >

                      <div className="management-restaurant-image">

                        <img
                          src={getRestaurantImage(
                            restaurant
                          )}
                          alt={
                            restaurant.name
                          }
                          onError={(
                            event
                          ) => {
                            event.currentTarget.src =
                              FALLBACK_RESTAURANT_IMAGE;
                          }}
                        />

                        <div className="restaurant-image-overlay" />

                        <div className="restaurant-rating">

                          <Star
                            size={13}
                            fill="currentColor"
                          />

                          {Number(
                            restaurant.rating ||
                              0
                          ).toFixed(1)}

                        </div>

                      </div>

                      <div className="management-restaurant-info">

                        <h3>
                          {
                            restaurant.name
                          }
                        </h3>

                        <div>
                          <MapPin
                            size={13}
                          />

                          {restaurant.city ||
                            "Hyderabad"}
                        </div>

                        <span>
                          View Orders →
                        </span>

                      </div>

                    </button>
                  )
                )}

              </div>
            )}

          </section>
        )}

        {/* ==================================================
            ORDERS
        ================================================== */}

        {activeView ===
          "orders" && (
          <section className="orders-view">

            {/* SELECTED RESTAURANT */}

            <div className="selected-restaurant-header">

              <div className="selected-restaurant-title">

                <div className="selected-restaurant-icon">
                  <Store size={20} />
                </div>

                <div>
                  <p>
                    SELECTED RESTAURANT
                  </p>

                  <h2>
                    {selectedRestaurant?.name ||
                      "Select Restaurant"}
                  </h2>
                </div>

              </div>

              <div className="live-orders-badge">
                <span />
                LIVE ORDERS
              </div>

            </div>

            {/* RESTAURANT SWITCHER */}

            <div className="order-restaurant-switcher">

              {restaurants.map(
                (restaurant) => (
                  <button
                    key={
                      restaurant.restaurant_id
                    }
                    className={
                      Number(
                        selectedRestaurant?.restaurant_id
                      ) ===
                      Number(
                        restaurant.restaurant_id
                      )
                        ? "restaurant-switch-button active"
                        : "restaurant-switch-button"
                    }
                    onClick={() => {
                      setSelectedRestaurant(
                        restaurant
                      );

                      setOrderTab(
                        "active"
                      );
                    }}
                  >
                    {
                      restaurant.name
                    }
                  </button>
                )
              )}

            </div>

            {/* ORDER TABS */}

            <div className="order-filter-tabs">

              <button
                className={
                  orderTab ===
                  "active"
                    ? "order-filter-tab active"
                    : "order-filter-tab"
                }
                onClick={() =>
                  setOrderTab(
                    "active"
                  )
                }
              >
                <Clock3 size={17} />

                <span>
                  Active Orders
                </span>

                <b>
                  {activeOrders.length}
                </b>
              </button>

              <button
                className={
                  orderTab === "old"
                    ? "order-filter-tab active"
                    : "order-filter-tab"
                }
                onClick={() =>
                  setOrderTab("old")
                }
              >
                <History size={17} />

                <span>
                  Old Orders
                </span>

                <b>
                  {oldOrders.length}
                </b>
              </button>

              <button
                className={
                  orderTab === "all"
                    ? "order-filter-tab active"
                    : "order-filter-tab"
                }
                onClick={() =>
                  setOrderTab("all")
                }
              >
                <Layers3 size={17} />

                <span>
                  All Orders
                </span>

                <b>
                  {allOrders.length}
                </b>
              </button>

            </div>

            {/* ERROR */}

            {ordersError && (
              <div className="dashboard-error">
                <AlertCircle
                  size={18}
                />

                {ordersError}
              </div>
            )}

            {/* LOADING */}

            {loadingOrders ? (
              <div className="dashboard-loading">
                Loading orders...
              </div>
            ) : displayedOrders.length ===
              0 ? (
              <div className="empty-orders">

                <Package size={50} />

                <h3>
                  {orderTab === "old"
                    ? "No old orders"
                    : orderTab === "all"
                    ? "No orders"
                    : "No active orders"}
                </h3>

                <p>
                  {orderTab === "old"
                    ? "Completed or cancelled orders will appear here."
                    : orderTab ===
                      "active"
                    ? "New restaurant orders will appear here."
                    : "Orders received by this restaurant will appear here."}
                </p>

              </div>
            ) : (
              <div className="restaurant-orders-list">

                {displayedOrders.map(
                  (order) => (
                    <article
                      key={
                        order.order_id
                      }
                      className="restaurant-order-card"
                    >

                      {/* ORDER HEADER */}

                      <div className="restaurant-order-header">

                        <div>
                          <p>
                            ORDER #
                            {
                              order.order_id
                            }
                          </p>

                          <span>
                            {formatDate(
                              order.created_at
                            )}
                          </span>
                        </div>

                        <div
                          className={`restaurant-order-status ${statusClass(
                            order.status
                          )}`}
                        >
                          {formatStatus(
                            order.status
                          )}
                        </div>

                      </div>

                      {/* CUSTOMER */}

                      <div className="restaurant-customer">

                        <div className="customer-avatar">
                          {(
                            order.customer_name ||
                            "C"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {order.customer_name ||
                              "Customer"}
                          </strong>

                          <span>
                            <Phone
                              size={13}
                            />

                            {order.customer_phone ||
                              "Phone not available"}
                          </span>
                        </div>

                      </div>

                      {/* ORDER ITEMS */}

                      {order.items &&
                        order.items
                          .length >
                          0 && (
                          <div className="restaurant-order-items">

                            <div className="order-items-heading">
                              <Utensils
                                size={16}
                              />

                              <strong>
                                Order Items
                              </strong>
                            </div>

                            <div className="order-items-list">

                              {order.items.map(
                                (item) => (
                                  <div
                                    className="restaurant-order-item"
                                    key={
                                      item.order_item_id
                                    }
                                  >

                                    <div>
                                      <strong>
                                        {
                                          item.name
                                        }
                                      </strong>

                                      <span>
                                        ×{" "}
                                        {
                                          item.quantity
                                        }
                                      </span>
                                    </div>

                                    <strong>
                                      ₹
                                      {Number(
                                        item.item_total ||
                                          item.unit_price *
                                            item.quantity ||
                                          0
                                      ).toFixed(
                                        0
                                      )}
                                    </strong>

                                  </div>
                                )
                              )}

                            </div>

                          </div>
                        )}

                      {/* ORDER INFO */}

                      <div className="restaurant-order-info-grid">

                        <div>
                          <span>
                            Order Amount
                          </span>

                          <strong>
                            ₹
                            {Number(
                              order.total_amount ||
                                0
                            ).toFixed(0)}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Delivery Fee
                          </span>

                          <strong>
                            ₹
                            {Number(
                              order.delivery_fee ||
                                0
                            ).toFixed(0)}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Payment
                          </span>

                          <strong className="payment-pending-text">
                            {order.payment_status ||
                              "PENDING"}
                          </strong>
                        </div>

                      </div>

                      {/* RESTAURANT STATUS */}

                      {ACTIVE_STATUSES.includes(
                        order.status
                      ) && (
                        <div className="restaurant-status-control">

                          <div className="status-control-title">

                            <ChefHat
                              size={17}
                            />

                            <strong>
                              Restaurant
                              Order Status
                            </strong>

                          </div>

                          <div className="restaurant-status-flow">

                            {RESTAURANT_STATUSES.map(
                              (status) => {
                                const Icon =
                                  status.icon;

                                const isCurrent =
                                  order.status ===
                                  status.key;

                                const isAllowed =
                                  canUpdateStatus(
                                    order.status,
                                    status.key
                                  );

                                const isDisabled =
                                  updatingOrderId ===
                                    order.order_id ||
                                  !isAllowed;

                                return (
                                  <button
                                    key={
                                      status.key
                                    }
                                    className={
                                      isCurrent
                                        ? "restaurant-status-button current"
                                        : isAllowed
                                        ? "restaurant-status-button next"
                                        : "restaurant-status-button disabled"
                                    }
                                    disabled={
                                      isDisabled
                                    }
                                    onClick={() =>
                                      changeOrderStatus(
                                        order.order_id,
                                        status.key
                                      )
                                    }
                                  >
                                    <Icon
                                      size={
                                        14
                                      }
                                    />

                                    {isCurrent
                                      ? status.shortLabel
                                      : status.label}
                                  </button>
                                );
                              }
                            )}

                          </div>

                          <p className="restaurant-role-note">
                            Restaurant handles:
                            Confirm →
                            Preparing →
                            Ready for Pickup
                          </p>

                        </div>
                      )}

                      {/* READY FOR PICKUP */}

                      {order.status ===
                        "READY_FOR_PICKUP" && (
                        <div className="handover-message">

                          <Truck
                            size={18}
                          />

                          <div>
                            <strong>
                              Ready for
                              Delivery Partner
                            </strong>

                            <span>
                              Restaurant
                              preparation is
                              complete.
                              Delivery partner
                              will handle the
                              next stages.
                            </span>
                          </div>

                        </div>
                      )}

                      {/* OLD ORDER */}

                      {OLD_STATUSES.includes(
                        order.status
                      ) && (
                        <div className="completed-order-message">

                          <CheckCircle2
                            size={18}
                          />

                          <span>
                            {order.status ===
                            "DELIVERED"
                              ? "Order completed and delivered."
                              : "Order was cancelled."}
                          </span>

                        </div>
                      )}

                    </article>
                  )
                )}

              </div>
            )}

          </section>
        )}

      </main>
    </div>
  );
}

export default RestaurantDashboard;