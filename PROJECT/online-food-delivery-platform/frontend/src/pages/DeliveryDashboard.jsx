import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LayoutDashboard,
  Package,
  Clock3,
  CheckCircle2,
  Truck,
  MapPin,
  Phone,
  IndianRupee,
  RefreshCw,
  LogOut,
  ChevronRight,
  Bike,
  UserRound,
  Store,
  CircleDot,
  AlertCircle,
  Power,
} from "lucide-react";

import {
  getDeliveryDashboard,
  pickupDeliveryOrder,
  deliverDeliveryOrder,
  updateDeliveryAvailability,
} from "../services/api";

import "./DeliveryDashboard.css";

function DeliveryDashboard({
  deliveryUser,
  onLogout,
}) {
  const [activeView, setActiveView] =
    useState("dashboard");

  const [partner, setPartner] =
    useState(null);

  const [orders, setOrders] =
    useState([]);

  const [completedOrders, setCompletedOrders] =
    useState([]);

  const [dashboardStats, setDashboardStats] =
    useState({
      availableOrders: 0,
      activeOrders: 0,
      completedOrders: 0,
      totalEarnings: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [actionOrderId, setActionOrderId] =
    useState(null);

  const [availability, setAvailability] =
    useState("AVAILABLE");

  // ============================================================
  // DELIVERY PARTNER ID
  // ============================================================

  const partnerId = useMemo(() => {
    if (deliveryUser?.partner_id != null) {
      return Number(deliveryUser.partner_id);
    }

    if (
      deliveryUser?.delivery_partner_id != null
    ) {
      return Number(
        deliveryUser.delivery_partner_id
      );
    }

    /*
      Current FoodFlow database:

      user_id = 5
      partner_id = 1

      Current delivery login:
      delivery@gmail.com
    */

    if (
      Number(deliveryUser?.user_id) === 5
    ) {
      return 1;
    }

    return null;
  }, [deliveryUser]);

  // ============================================================
  // LOAD DELIVERY DASHBOARD
  // ============================================================

  const loadDashboard = async (
    showRefresh = false
  ) => {
    if (!partnerId) {
      setError(
        "Delivery partner information is missing."
      );

      setLoading(false);
      setRefreshing(false);

      return;
    }

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      // --------------------------------------------------------
      // MAIN DASHBOARD API
      // --------------------------------------------------------
      //
      // GET
      // /api/delivery-partners/:partnerId/dashboard
      //
      // Returns:
      // partner
      // stats
      // availableOrders
      // activeOrders
      // completedOrders
      //

      const response =
        await getDeliveryDashboard(
          partnerId
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to load delivery dashboard."
        );
      }

      // --------------------------------------------------------
      // PARTNER
      // --------------------------------------------------------

      const partnerData =
        response.partner || null;

      // --------------------------------------------------------
      // AVAILABLE ORDERS
      // --------------------------------------------------------

      const availableData =
        Array.isArray(
          response.availableOrders
        )
          ? response.availableOrders
          : [];

      // --------------------------------------------------------
      // ACTIVE ORDERS
      // --------------------------------------------------------

      const activeData =
        Array.isArray(
          response.activeOrders
        )
          ? response.activeOrders
          : [];

      // --------------------------------------------------------
      // COMPLETED ORDERS
      // --------------------------------------------------------

      const completedData =
        Array.isArray(
          response.completedOrders
        )
          ? response.completedOrders
          : [];

      // --------------------------------------------------------
      // COMBINE AVAILABLE + ACTIVE
      // --------------------------------------------------------

      const currentOrders = [
        ...availableData,
        ...activeData,
      ];

      setPartner(partnerData);

      setOrders(currentOrders);

      setCompletedOrders(
        completedData
      );

      // --------------------------------------------------------
      // BACKEND STATS
      // --------------------------------------------------------

      setDashboardStats({
        availableOrders: Number(
          response.stats
            ?.availableOrders || 0
        ),

        activeOrders: Number(
          response.stats
            ?.activeOrders || 0
        ),

        completedOrders: Number(
          response.stats
            ?.completedOrders || 0
        ),

        totalEarnings: Number(
          response.stats
            ?.totalEarnings || 0
        ),
      });

      // --------------------------------------------------------
      // AVAILABILITY
      // --------------------------------------------------------

      if (
        partnerData?.availability_status
      ) {
        setAvailability(
          partnerData.availability_status
        );
      }

    } catch (err) {
      console.error(
        "Delivery dashboard error:",
        err
      );

      setError(
        err.message ||
          "Unable to load delivery dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadDashboard();
  }, [partnerId]);

  // ============================================================
  // AUTO REFRESH
  // ============================================================

  useEffect(() => {
    if (!partnerId) {
      return;
    }

    const interval =
      setInterval(() => {
        loadDashboard(true);
      }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [partnerId]);

  // ============================================================
  // AVAILABLE ORDERS
  // ============================================================

  const availableOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.status ===
          "READY_FOR_PICKUP" &&
        !order.delivery_partner_id
    );
  }, [orders]);

  // ============================================================
  // ACTIVE ORDERS
  // ============================================================

  const activeOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        Number(
          order.delivery_partner_id
        ) === Number(partnerId) &&
        order.status ===
          "OUT_FOR_DELIVERY"
    );
  }, [orders, partnerId]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    return {
      availableOrders:
        dashboardStats.availableOrders ||
        availableOrders.length,

      activeOrders:
        dashboardStats.activeOrders ||
        activeOrders.length,

      completedOrders:
        dashboardStats.completedOrders ||
        completedOrders.length,

      totalEarnings:
        Number(
          dashboardStats.totalEarnings || 0
        ),
    };
  }, [
    dashboardStats,
    availableOrders,
    activeOrders,
    completedOrders,
  ]);

  // ============================================================
  // ACCEPT & START DELIVERY
  // ============================================================

  const handleAcceptOrder = async (
    orderId
  ) => {
    if (!partnerId) {
      setError(
        "Delivery partner information is missing."
      );

      return;
    }

    try {
      setActionOrderId(orderId);
      setError("");

      /*
        READY_FOR_PICKUP
              ↓
        OUT_FOR_DELIVERY
      */

      const response =
        await pickupDeliveryOrder(
          orderId,
          partnerId
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to accept delivery."
        );
      }

      await loadDashboard(true);

      setActiveView("orders");

    } catch (err) {
      console.error(
        "Accept delivery error:",
        err
      );

      setError(
        err.message ||
          "Unable to accept delivery."
      );
    } finally {
      setActionOrderId(null);
    }
  };

  // ============================================================
  // MARK ORDER DELIVERED
  // ============================================================

  const handleDeliverOrder = async (
    orderId
  ) => {
    if (!partnerId) {
      setError(
        "Delivery partner information is missing."
      );

      return;
    }

    try {
      setActionOrderId(orderId);
      setError("");

      /*
        OUT_FOR_DELIVERY
              ↓
        DELIVERED
      */

      const response =
        await deliverDeliveryOrder(
          orderId,
          partnerId
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to mark order as delivered."
        );
      }

      await loadDashboard(true);

      setActiveView("dashboard");

    } catch (err) {
      console.error(
        "Deliver order error:",
        err
      );

      setError(
        err.message ||
          "Unable to mark order as delivered."
      );
    } finally {
      setActionOrderId(null);
    }
  };

  // ============================================================
  // AVAILABILITY
  // ============================================================

  const handleAvailabilityChange = async (
    newStatus
  ) => {
    if (!partnerId) {
      return;
    }

    try {
      setError("");

      const response =
        await updateDeliveryAvailability(
          partnerId,
          newStatus
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to update availability."
        );
      }

      setAvailability(newStatus);

      setPartner((previous) => ({
        ...(previous || {}),
        availability_status:
          newStatus,
      }));

    } catch (err) {
      console.error(
        "Availability error:",
        err
      );

      setError(
        err.message ||
          "Unable to update availability."
      );
    }
  };

  // ============================================================
  // STATUS LABEL
  // ============================================================

  const getStatusLabel = (
    status
  ) => {
    const labels = {
      READY_FOR_PICKUP:
        "Ready for Pickup",

      OUT_FOR_DELIVERY:
        "Out for Delivery",

      DELIVERED:
        "Delivered",

      CANCELLED:
        "Cancelled",
    };

    return (
      labels[status] || status
    );
  };

  // ============================================================
  // STATUS CLASS
  // ============================================================

  const getStatusClass = (
    status
  ) => {
    if (
      status ===
      "READY_FOR_PICKUP"
    ) {
      return "delivery-status ready";
    }

    if (
      status ===
      "OUT_FOR_DELIVERY"
    ) {
      return "delivery-status out";
    }

    if (
      status === "DELIVERED"
    ) {
      return "delivery-status delivered";
    }

    return "delivery-status";
  };

  // ============================================================
  // ORDER CARD
  // ============================================================

  const OrderCard = ({
    order,
    available = false,
  }) => {
    const isLoading =
      actionOrderId ===
      order.order_id;

    return (
      <article className="delivery-order-card">

        {/* ORDER HEADER */}

        <div className="delivery-order-top">

          <div>

            <div className="delivery-order-id">
              ORDER #{order.order_id}
            </div>

            <h3>
              {order.restaurant_name ||
                "FoodFlow Restaurant"}
            </h3>

          </div>

          <span
            className={getStatusClass(
              order.status
            )}
          >
            {getStatusLabel(
              order.status
            )}
          </span>

        </div>

        <div className="delivery-order-divider" />

        {/* LOCATIONS */}

        <div className="delivery-order-location">

          {/* RESTAURANT */}

          <div className="location-row">

            <div className="location-icon restaurant">
              <Store size={17} />
            </div>

            <div>

              <span>
                Pickup from
              </span>

              <strong>
                {order.restaurant_name ||
                  "Restaurant"}
              </strong>

              <p>
                {order.restaurant_address ||
                  "Restaurant location"}
              </p>

            </div>

          </div>

          <div className="location-line" />

          {/* CUSTOMER */}

          <div className="location-row">

            <div className="location-icon customer">
              <MapPin size={17} />
            </div>

            <div>

              <span>
                Deliver to
              </span>

              <strong>
                {order.customer_name ||
                  "Customer"}
              </strong>

              <p>
                {order.customer_address ||
                  "Address not available"}
              </p>

              {(order.customer_city ||
                order.customer_pincode) && (
                <p>
                  {order.customer_city ||
                    ""}

                  {order.customer_pincode
                    ? ` - ${order.customer_pincode}`
                    : ""}
                </p>
              )}

            </div>

          </div>

        </div>

        {/* ORDER INFORMATION */}

        <div className="delivery-order-info">

          {/* CUSTOMER */}

          <div>

            <span>
              Customer
            </span>

            <strong>
              <UserRound size={15} />

              {order.customer_name ||
                "Customer"}
            </strong>

          </div>

          {/* PHONE */}

          <div>

            <span>
              Phone
            </span>

            <strong>
              <Phone size={15} />

              {order.customer_phone ||
                "Not available"}
            </strong>

          </div>

          {/* ORDER VALUE */}

          <div>

            <span>
              Order Value
            </span>

            <strong>
              ₹
              {Number(
                order.total_amount || 0
              ).toFixed(0)}
            </strong>

          </div>

          {/* DELIVERY FEE */}

          <div>

            <span>
              Delivery Fee
            </span>

            <strong className="earning-value">
              ₹
              {Number(
                order.delivery_fee || 0
              ).toFixed(0)}
            </strong>

          </div>

        </div>

        {/* AVAILABLE ORDER */}

        {available && (
          <button
            className="delivery-primary-btn"
            disabled={isLoading}
            onClick={() =>
              handleAcceptOrder(
                order.order_id
              )
            }
          >

            <Bike size={18} />

            {isLoading
              ? "Accepting..."
              : "Accept & Start Delivery"}

            <ChevronRight size={18} />

          </button>
        )}

        {/* ACTIVE DELIVERY */}

        {!available &&
          order.status ===
            "OUT_FOR_DELIVERY" && (
            <button
              className="delivery-success-btn"
              disabled={isLoading}
              onClick={() =>
                handleDeliverOrder(
                  order.order_id
                )
              }
            >

              <CheckCircle2 size={18} />

              {isLoading
                ? "Updating..."
                : "Mark as Delivered"}

              <ChevronRight size={18} />

            </button>
          )}

        {/* DELIVERED */}

        {order.status ===
          "DELIVERED" && (
          <div className="delivery-completed-message">

            <CheckCircle2 size={18} />

            <span>
              Delivery completed
              successfully.
            </span>

          </div>
        )}

      </article>
    );
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {
    return (
      <div className="delivery-dashboard-page">

        <div className="delivery-dashboard-loading">

          <div className="delivery-loading-spinner" />

          <h2>
            Loading Delivery Dashboard
          </h2>

          <p>
            Fetching your latest delivery
            orders...
          </p>

        </div>

      </div>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="delivery-dashboard-page">

      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside className="delivery-sidebar">

        {/* BRAND */}

        <div className="delivery-sidebar-brand">

          <div className="delivery-logo">
            F
          </div>

          <div>

            <strong>
              FoodFlow
            </strong>

            <span>
              Delivery Partner
            </span>

          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="delivery-sidebar-nav">

          {/* DASHBOARD */}

          <button
            className={
              activeView ===
              "dashboard"
                ? "delivery-nav-item active"
                : "delivery-nav-item"
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

          {/* ORDERS */}

          <button
            className={
              activeView ===
              "orders"
                ? "delivery-nav-item active"
                : "delivery-nav-item"
            }
            onClick={() =>
              setActiveView(
                "orders"
              )
            }
          >

            <Package size={19} />

            <span>
              Delivery Orders
            </span>

            {stats.availableOrders >
              0 && (
              <b className="delivery-nav-count">
                {
                  stats.availableOrders
                }
              </b>
            )}

          </button>

          {/* COMPLETED */}

          <button
            className={
              activeView ===
              "completed"
                ? "delivery-nav-item active"
                : "delivery-nav-item"
            }
            onClick={() =>
              setActiveView(
                "completed"
              )
            }
          >

            <CheckCircle2
              size={19}
            />

            <span>
              Completed
            </span>

          </button>

        </nav>

        {/* SIDEBAR BOTTOM */}

        <div className="delivery-sidebar-bottom">

          {/* USER */}

          <div className="delivery-user-mini">

            <div className="delivery-user-avatar">

              {(
                partner?.name ||
                deliveryUser?.name ||
                "D"
              )
                .charAt(0)
                .toUpperCase()}

            </div>

            <div>

              <strong>
                {partner?.name ||
                  deliveryUser?.name ||
                  "FoodFlow Delivery"}
              </strong>

              <span>
                {partner?.email ||
                  deliveryUser?.email ||
                  "delivery@gmail.com"}
              </span>

            </div>

          </div>

          {/* AVAILABILITY */}

          <div className="delivery-availability-box">

            <div>

              <Power size={16} />

              <span>
                Availability
              </span>

            </div>

            <select
              value={availability}
              onChange={(event) =>
                handleAvailabilityChange(
                  event.target.value
                )
              }
            >

              <option value="AVAILABLE">
                Available
              </option>

              <option value="BUSY">
                Busy
              </option>

              <option value="OFFLINE">
                Offline
              </option>

            </select>

          </div>

          {/* LOGOUT */}

          <button
            className="delivery-logout-btn"
            onClick={onLogout}
          >

            <LogOut size={17} />

            Logout

          </button>

        </div>

      </aside>

      {/* ==================================================
          MAIN CONTENT
      ================================================== */}

      <main className="delivery-main">

        {/* HEADER */}

        <header className="delivery-header">

          <div>

            <p>
              DELIVERY PARTNER
            </p>

            <h1>

              {activeView ===
                "dashboard" &&
                "Dashboard"}

              {activeView ===
                "orders" &&
                "Delivery Orders"}

              {activeView ===
                "completed" &&
                "Completed Deliveries"}

            </h1>

          </div>

          <button
            className="delivery-refresh-btn"
            onClick={() =>
              loadDashboard(true)
            }
          >

            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "delivery-spin"
                  : ""
              }
            />

            Refresh

          </button>

        </header>

        {/* ERROR */}

        {error && (
          <div className="delivery-error-banner">

            <AlertCircle size={18} />

            <span>
              {error}
            </span>

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>
        )}

        {/* ==================================================
            DASHBOARD
        ================================================== */}

        {activeView ===
          "dashboard" && (
          <>

            {/* WELCOME */}

            <section className="delivery-welcome-card">

              <div>

                <span className="delivery-section-label">
                  FOODFLOW DELIVERY CENTER
                </span>

                <h2>
                  Welcome back,{" "}
                  {(
                    partner?.name ||
                    deliveryUser?.name ||
                    "Partner"
                  ).split(" ")[0]}
                  !
                </h2>

                <p>
                  Pick up restaurant
                  orders, deliver them
                  to customers and keep
                  every order moving.
                </p>

              </div>

              <div className="delivery-welcome-icon">
                <Bike size={48} />
              </div>

            </section>

            {/* STATS */}

            <section className="delivery-stat-grid">

              {/* AVAILABLE */}

              <div className="delivery-stat-card">

                <div className="delivery-stat-icon orange">
                  <Package size={22} />
                </div>

                <div>

                  <span>
                    Available Orders
                  </span>

                  <strong>
                    {
                      stats.availableOrders
                    }
                  </strong>

                </div>

              </div>

              {/* ACTIVE */}

              <div className="delivery-stat-card">

                <div className="delivery-stat-icon blue">
                  <Truck size={22} />
                </div>

                <div>

                  <span>
                    Active Deliveries
                  </span>

                  <strong>
                    {
                      stats.activeOrders
                    }
                  </strong>

                </div>

              </div>

              {/* COMPLETED */}

              <div className="delivery-stat-card">

                <div className="delivery-stat-icon green">
                  <CheckCircle2
                    size={22}
                  />
                </div>

                <div>

                  <span>
                    Completed
                  </span>

                  <strong>
                    {
                      stats.completedOrders
                    }
                  </strong>

                </div>

              </div>

              {/* EARNINGS */}

              <div className="delivery-stat-card">

                <div className="delivery-stat-icon purple">
                  <IndianRupee
                    size={22}
                  />
                </div>

                <div>

                  <span>
                    Total Earnings
                  </span>

                  <strong>
                    ₹
                    {Number(
                      stats.totalEarnings
                    ).toFixed(0)}
                  </strong>

                </div>

              </div>

            </section>

            {/* ACTIVE ORDERS */}

            <section className="delivery-section">

              <div className="delivery-section-heading">

                <div>

                  <span>
                    ACTIVE DELIVERY
                  </span>

                  <h2>
                    Your Current Orders
                  </h2>

                </div>

                <button
                  onClick={() =>
                    setActiveView(
                      "orders"
                    )
                  }
                >

                  View all

                  <ChevronRight
                    size={17}
                  />

                </button>

              </div>

              {activeOrders.length >
              0 ? (

                <div className="delivery-orders-list">

                  {activeOrders
                    .slice(0, 3)
                    .map(
                      (order) => (
                        <OrderCard
                          key={
                            order.order_id
                          }
                          order={
                            order
                          }
                        />
                      )
                    )}

                </div>

              ) : (

                <div className="delivery-empty-card">

                  <div>
                    <Package size={32} />
                  </div>

                  <h3>
                    No active deliveries
                  </h3>

                  <p>
                    Accept a ready
                    order to start
                    your next
                    delivery.
                  </p>

                  {availableOrders.length >
                    0 && (
                    <button
                      onClick={() =>
                        setActiveView(
                          "orders"
                        )
                      }
                    >

                      View Available
                      Orders

                      <ChevronRight
                        size={17}
                      />

                    </button>
                  )}

                </div>

              )}

            </section>

            {/* AVAILABLE ORDERS */}

            <section className="delivery-section">

              <div className="delivery-section-heading">

                <div>

                  <span>
                    READY FOR PICKUP
                  </span>

                  <h2>
                    Available Deliveries
                  </h2>

                </div>

                <button
                  onClick={() =>
                    setActiveView(
                      "orders"
                    )
                  }
                >

                  View all

                  <ChevronRight
                    size={17}
                  />

                </button>

              </div>

              {availableOrders.length >
              0 ? (

                <div className="delivery-orders-list">

                  {availableOrders
                    .slice(0, 3)
                    .map(
                      (order) => (
                        <OrderCard
                          key={
                            order.order_id
                          }
                          order={
                            order
                          }
                          available
                        />
                      )
                    )}

                </div>

              ) : (

                <div className="delivery-empty-card compact">

                  <Clock3 size={28} />

                  <div>

                    <h3>
                      No orders waiting
                    </h3>

                    <p>
                      New restaurant-ready
                      orders will appear
                      here automatically.
                    </p>

                  </div>

                </div>

              )}

            </section>

          </>
        )}

        {/* ==================================================
            ORDERS VIEW
        ================================================== */}

        {activeView ===
          "orders" && (

          <section className="delivery-section">

            <div className="delivery-section-heading">

              <div>

                <span>
                  DELIVERY QUEUE
                </span>

                <h2>
                  Available & Active
                  Orders
                </h2>

              </div>

            </div>

            {/* AVAILABLE */}

            {availableOrders.length >
              0 && (

              <>
                <div className="delivery-subheading">

                  <CircleDot
                    size={17}
                  />

                  Ready for Pickup

                </div>

                <div className="delivery-orders-list">

                  {availableOrders.map(
                    (order) => (
                      <OrderCard
                        key={
                          order.order_id
                        }
                        order={order}
                        available
                      />
                    )
                  )}

                </div>
              </>

            )}

            {/* ACTIVE */}

            {activeOrders.length >
              0 && (

              <>
                <div className="delivery-subheading active-heading">

                  <Truck size={17} />

                  My Active Deliveries

                </div>

                <div className="delivery-orders-list">

                  {activeOrders.map(
                    (order) => (
                      <OrderCard
                        key={
                          order.order_id
                        }
                        order={order}
                      />
                    )
                  )}

                </div>
              </>

            )}

            {/* EMPTY */}

            {availableOrders.length ===
              0 &&
              activeOrders.length ===
                0 && (

              <div className="delivery-empty-card">

                <Package size={38} />

                <h3>
                  No delivery orders
                </h3>

                <p>
                  There are currently
                  no orders waiting
                  for a delivery partner.
                </p>

              </div>

            )}

          </section>
        )}

        {/* ==================================================
            COMPLETED VIEW
        ================================================== */}

        {activeView ===
          "completed" && (

          <section className="delivery-section">

            <div className="delivery-section-heading">

              <div>

                <span>
                  DELIVERY HISTORY
                </span>

                <h2>
                  Completed Deliveries
                </h2>

              </div>

            </div>

            {completedOrders.length >
            0 ? (

              <div className="delivery-orders-list">

                {completedOrders.map(
                  (order) => (
                    <OrderCard
                      key={
                        order.order_id
                      }
                      order={order}
                    />
                  )
                )}

              </div>

            ) : (

              <div className="delivery-empty-card">

                <CheckCircle2
                  size={38}
                />

                <h3>
                  No completed deliveries
                </h3>

                <p>
                  Your completed
                  deliveries will
                  appear here.
                </p>

              </div>

            )}

          </section>

        )}

      </main>

    </div>
  );
}

export default DeliveryDashboard;