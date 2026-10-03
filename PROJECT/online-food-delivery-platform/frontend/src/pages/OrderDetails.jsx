import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Package,
  MapPin,
  Clock3,
  CreditCard,
  CheckCircle2,
  Circle,
  Loader2,
  Phone,
  Radio,
  RefreshCw,
} from "lucide-react";

import { io } from "socket.io-client";

import { getOrderById } from "../services/api";

// ============================================================
// SOCKET SERVER
// ============================================================

const SOCKET_URL = "http://localhost:5000";

// ============================================================
// STATUS STEPS
// ============================================================

const statusSteps = [
  {
    key: "PLACED",
    label: "Order Placed",
    description:
      "Your order has been received.",
  },

  {
    key: "CONFIRMED",
    label: "Order Confirmed",
    description:
      "Restaurant has confirmed your order.",
  },

  {
    key: "PREPARING",
    label: "Preparing",
    description:
      "Your food is being prepared.",
  },

  {
    key: "READY_FOR_PICKUP",
    label: "Ready for Pickup",
    description:
      "Your food is ready for delivery.",
  },

  {
    key: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
    description:
      "Delivery partner is on the way.",
  },

  {
    key: "DELIVERED",
    label: "Delivered",
    description:
      "Your order has been delivered.",
  },
];

// ============================================================
// COMPONENT
// ============================================================

function OrderDetails({
  orderId,
  goBack,
  goHome,
}) {
  const [order, setOrder] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [liveConnected, setLiveConnected] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  // ==========================================================
  // LOAD ORDER
  // ==========================================================

  const loadOrder = async (
    showRefreshing = false
  ) => {
    if (!orderId) {
      setError(
        "Order ID is missing."
      );

      setLoading(false);

      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data =
        await getOrderById(orderId);

      if (data.success) {
        setOrder(data.order);
      } else {
        setError(
          data.message ||
            "Failed to load order details."
        );
      }
    } catch (err) {
      console.error(
        "Order details error:",
        err
      );

      setError(
        "Unable to load order details."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  // ==========================================================
  // SOCKET.IO LIVE ORDER TRACKING
  // ==========================================================

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const socket = io(
      SOCKET_URL,
      {
        transports: [
          "websocket",
          "polling",
        ],
      }
    );

    socket.on(
      "connect",
      () => {
        console.log(
          "🔴 Order tracking connected:",
          socket.id
        );

        setLiveConnected(true);

        socket.emit(
          "join-order",
          orderId
        );
      }
    );

    socket.on(
      "order-status-updated",
      (data) => {
        console.log(
          "📢 Live order update:",
          data
        );

        if (
          Number(data.orderId) !==
          Number(orderId)
        ) {
          return;
        }

        setOrder(
          (currentOrder) => {
            if (!currentOrder) {
              return currentOrder;
            }

            return {
              ...currentOrder,

              status:
                data.status ||
                currentOrder.status,

              updated_at:
                data.timestamp ||
                currentOrder.updated_at,
            };
          }
        );
      }
    );

    socket.on(
      "disconnect",
      () => {
        console.log(
          "🔌 Order tracking disconnected"
        );

        setLiveConnected(false);
      }
    );

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "Socket connection error:",
          error
        );

        setLiveConnected(false);
      }
    );

    return () => {
      socket.emit(
        "leave-order",
        orderId
      );

      socket.off(
        "order-status-updated"
      );

      socket.disconnect();
    };
  }, [orderId]);

  // ==========================================================
  // FORMAT STATUS
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
  // FORMAT DATE
  // ==========================================================

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

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
  // STATUS INDEX
  // ==========================================================

  const getStatusIndex = () => {
    if (!order) {
      return -1;
    }

    return statusSteps.findIndex(
      (step) =>
        step.key === order.status
    );
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="order-details-page">
        <div className="order-details-loading">
          <Loader2
            size={35}
            className="spin"
          />

          <p>
            Loading order details...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error ||
    !order
  ) {
    return (
      <div className="order-details-page">
        <div className="order-details-error">
          <Package size={50} />

          <h2>
            Unable to Load Order
          </h2>

          <p>
            {error ||
              "Order details could not be found."}
          </p>

          <div className="order-details-error-actions">
            <button
              onClick={goBack}
            >
              <ArrowLeft
                size={18}
              />

              Back to Orders
            </button>

            <button
              onClick={goHome}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // BILL CALCULATIONS
  // ==========================================================

  const subtotal =
    (
      order.items || []
    ).reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.unit_price || 0
        ) *
          Number(
            item.quantity || 0
          ),
      0
    );

  const deliveryFee =
    Number(
      order.delivery_fee || 0
    );

  const total =
    Number(
      order.total_amount ||
        subtotal +
          deliveryFee
    );

  const statusIndex =
    getStatusIndex();

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="order-details-page">

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <div className="order-details-topbar">

        <button
          onClick={goBack}
        >
          <ArrowLeft
            size={19}
          />

          Back to Orders
        </button>

        <button
          onClick={() =>
            loadOrder(true)
          }
          disabled={
            refreshing
          }
          title="Refresh order"
        >
          <RefreshCw
            size={18}
            className={
              refreshing
                ? "spin"
                : ""
            }
          />

          Refresh
        </button>

      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="order-details-container">

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="order-details-header">

          <div>

            <p className="section-label">
              FOODFLOW
            </p>

            <h1>
              Order Details
            </h1>

            <p>
              Order #
              {order.order_id}
            </p>

          </div>

          <div
            className={`order-details-status status-${String(
              order.status ||
                "PLACED"
            ).toLowerCase()}`}
          >
            {formatStatus(
              order.status
            )}
          </div>

        </div>

        {/* ===================================================
            LIVE CONNECTION
        =================================================== */}

        <div
          className={`live-tracking-banner ${
            liveConnected
              ? "connected"
              : "disconnected"
          }`}
        >

          <Radio
            size={17}
          />

          <span>
            {liveConnected
              ? "Live order tracking connected"
              : "Live tracking reconnecting..."}
          </span>

        </div>

        {/* ===================================================
            ORDER TRACKING
        =================================================== */}

        <section className="order-status-card">

          <div className="order-status-card-header">

            <div>

              <h2>
                <Clock3
                  size={20}
                />

                Order Tracking
              </h2>

              <p>
                {order.status ===
                "DELIVERED"
                  ? "Your order has been delivered."
                  : order.status ===
                    "CANCELLED"
                  ? "This order has been cancelled."
                  : "Track your order progress in real time."}
              </p>

            </div>

          </div>

          {order.status ===
          "CANCELLED" ? (
            <div className="cancelled-order">

              <Package
                size={28}
              />

              <div>

                <strong>
                  Order Cancelled
                </strong>

                <p>
                  This order is no
                  longer being
                  processed.
                </p>

              </div>

            </div>
          ) : (
            <div className="status-timeline">

              {statusSteps.map(
                (
                  step,
                  index
                ) => {

                  const completed =
                    index <=
                    statusIndex;

                  const active =
                    index ===
                    statusIndex;

                  return (
                    <div
                      className={`status-step ${
                        completed
                          ? "completed"
                          : ""
                      } ${
                        active
                          ? "active"
                          : ""
                      }`}
                      key={
                        step.key
                      }
                    >

                      <div className="status-step-icon">

                        {completed ? (
                          <CheckCircle2
                            size={
                              22
                            }
                          />
                        ) : (
                          <Circle
                            size={
                              22
                            }
                          />
                        )}

                      </div>

                      <div className="status-step-content">

                        <strong>
                          {
                            step.label
                          }
                        </strong>

                        <p>
                          {
                            step.description
                          }
                        </p>

                        {active && (
                          <span className="current-status-label">
                            Current Status
                          </span>
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* ===================================================
            TWO COLUMN LAYOUT
        =================================================== */}

        <div className="order-details-grid">

          {/* =================================================
              LEFT COLUMN
          ================================================= */}

          <div>

            {/* =================================================
                RESTAURANT
            ================================================= */}

            <section className="order-info-card">

              <div className="card-title">

                <Package
                  size={20}
                />

                <h2>
                  Restaurant
                </h2>

              </div>

              <h3>
                {order.restaurant_name ||
                  "FoodFlow Restaurant"}
              </h3>

              <p>
                Order placed on{" "}
                {formatDate(
                  order.created_at
                )}
              </p>

            </section>

            {/* =================================================
                ORDER ITEMS
            ================================================= */}

            <section className="order-info-card">

              <div className="card-title">

                <Package
                  size={20}
                />

                <h2>
                  Ordered Items
                </h2>

              </div>

              <div className="order-items-list">

                {(order.items ||
                  []).map(
                  (item) => (
                    <div
                      className="order-detail-item"
                      key={
                        item.order_item_id
                      }
                    >

                      <div className="order-item-quantity">
                        {
                          item.quantity
                        }x
                      </div>

                      <div className="order-item-name">

                        <strong>
                          {
                            item.name
                          }
                        </strong>

                        <span>
                          ₹
                          {Number(
                            item.unit_price ||
                              0
                          ).toFixed(
                            0
                          )}{" "}
                          each
                        </span>

                      </div>

                      <strong className="order-item-total">
                        ₹
                        {(
                          Number(
                            item.unit_price ||
                              0
                          ) *
                          Number(
                            item.quantity ||
                              0
                          )
                        ).toFixed(
                          0
                        )}
                      </strong>

                    </div>
                  )
                )}

              </div>

            </section>

            {/* =================================================
                DELIVERY ADDRESS
            ================================================= */}

            <section className="order-info-card">

              <div className="card-title">

                <MapPin
                  size={20}
                />

                <h2>
                  Delivery Address
                </h2>

              </div>

              {order.address_line ? (
                <div className="address-details">

                  <strong>
                    Delivery Location
                  </strong>

                  <p>
                    {
                      order.address_line
                    }
                  </p>

                  <p>
                    {
                      order.city
                    }
                    {order.state
                      ? `, ${order.state}`
                      : ""}
                    {order.pincode
                      ? ` - ${order.pincode}`
                      : ""}
                  </p>

                </div>
              ) : (
                <p>
                  Address information is
                  not available.
                </p>
              )}

            </section>

          </div>

          {/* =================================================
              RIGHT COLUMN
          ================================================= */}

          <aside>

            {/* =================================================
                BILL
            ================================================= */}

            <section className="order-bill-card">

              <h2>
                Bill Details
              </h2>

              <div>

                <span>
                  Item Total
                </span>

                <strong>
                  ₹
                  {subtotal.toFixed(
                    0
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Delivery Fee
                </span>

                <strong>
                  ₹
                  {deliveryFee.toFixed(
                    0
                  )}
                </strong>

              </div>

              <hr />

              <div className="order-grand-total">

                <span>
                  Total
                </span>

                <strong>
                  ₹
                  {total.toFixed(
                    0
                  )}
                </strong>

              </div>

            </section>

            {/* =================================================
                PAYMENT
            ================================================= */}

            <section className="order-info-card">

              <div className="card-title">

                <CreditCard
                  size={20}
                />

                <h2>
                  Payment
                </h2>

              </div>

              <div className="payment-detail">

                <span>
                  Payment Status
                </span>

                <strong
                  className={
                    order.payment_status ===
                    "PAID"
                      ? "payment-paid"
                      : "payment-pending"
                  }
                >
                  {order.payment_status ||
                    "PENDING"}
                </strong>

              </div>

              <div className="payment-detail">

                <span>
                  Payment Method
                </span>

                <strong>
                  {order.payment_method ||
                    "Online Payment"}
                </strong>

              </div>

              {order.transaction_id && (
                <div className="payment-detail">

                  <span>
                    Transaction ID
                  </span>

                  <strong>
                    {
                      order.transaction_id
                    }
                  </strong>

                </div>
              )}

              {order.paid_at && (
                <div className="payment-detail">

                  <span>
                    Paid At
                  </span>

                  <strong>
                    {formatDate(
                      order.paid_at
                    )}
                  </strong>

                </div>
              )}

            </section>

            {/* =================================================
                SUPPORT
            ================================================= */}

            <section className="order-help-card">

              <Phone
                size={22}
              />

              <div>

                <h3>
                  Need Help?
                </h3>

                <p>
                  Contact FoodFlow
                  support for
                  assistance with
                  your order.
                </p>

              </div>

            </section>

          </aside>

        </div>

      </main>

    </div>
  );
}

export default OrderDetails;