import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Package,
  Clock3,
  ChevronRight,
  Loader2,
  ShoppingBag,
} from "lucide-react";

import { getUserOrders } from "../services/api";

function MyOrders({ goHome, goOrderDetails }) {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(
      localStorage.getItem("foodflow_user") || "null"
    );

    setUser(storedUser);
  }, []);

  useEffect(() => {
    if (!user?.user_id) {
      setLoading(false);
      return;
    }

    const loadOrders = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getUserOrders(user.user_id);

        if (data.success) {
          setOrders(data.orders || []);
        } else {
          setError(
            data.message || "Failed to load orders."
          );
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load your orders.");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user]);

  const getStatusClass = (status) => {
    switch (status) {
      case "DELIVERED":
        return "status-delivered";

      case "CANCELLED":
        return "status-cancelled";

      case "OUT_FOR_DELIVERY":
        return "status-out";

      case "PREPARING":
        return "status-preparing";

      case "CONFIRMED":
        return "status-confirmed";

      default:
        return "status-placed";
    }
  };

  const formatStatus = (status) => {
    if (!status) return "PLACED";

    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) {
    return (
      <div className="my-orders-page">
        <div className="my-orders-empty">
          <Package size={55} />

          <h2>Please Login</h2>

          <p>
            Login to view your FoodFlow orders.
          </p>

          <button onClick={goHome}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-page">

      {/* TOP BAR */}

      <div className="my-orders-topbar">
        <button onClick={goHome}>
          <ArrowLeft size={19} />
          Back to Home
        </button>
      </div>

      {/* PAGE */}

      <main className="my-orders-container">

        <div className="my-orders-header">
          <div>
            <p className="section-label">
              FOODFLOW
            </p>

            <h1>My Orders</h1>

            <p>
              Track and manage your recent food
              orders.
            </p>
          </div>

          <div className="orders-count">
            <ShoppingBag size={19} />
            <span>
              {orders.length} order
              {orders.length !== 1
                ? "s"
                : ""}
            </span>
          </div>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="my-orders-loading">
            <Loader2
              size={28}
              className="spin"
            />

            <p>Loading your orders...</p>
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="my-orders-error">
            {error}
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          orders.length === 0 && (
            <div className="my-orders-empty">

              <div className="empty-order-icon">
                <ShoppingBag size={42} />
              </div>

              <h2>No Orders Yet</h2>

              <p>
                You haven't placed any orders yet.
                Start exploring restaurants and
                order something delicious!
              </p>

              <button onClick={goHome}>
                Browse Restaurants
              </button>

            </div>
          )}

        {/* ORDERS */}

        {!loading &&
          !error &&
          orders.length > 0 && (
            <div className="orders-list">

              {orders.map((order) => (
                <article
                  className="order-card"
                  key={order.order_id}
                >

                  <div className="order-card-top">

                    <div className="order-restaurant">

                      <div className="order-icon">
                        <Package size={22} />
                      </div>

                      <div>
                        <h2>
                          {order.restaurant_name ||
                            "FoodFlow Restaurant"}
                        </h2>

                        <p>
                          Order #
                          {order.order_id}
                        </p>
                      </div>

                    </div>

                    <span
                      className={`order-status ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {formatStatus(
                        order.status
                      )}
                    </span>

                  </div>

                  <div className="order-card-info">

                    <div>
                      <Clock3 size={16} />

                      <span>
                        {formatDate(
                          order.created_at
                        )}
                      </span>
                    </div>

                    <div>
                      <span>
                        Payment:
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

                    <div>
                      <span>Total:</span>

                      <strong>
                        ₹
                        {Number(
                          order.total_amount || 0
                        ).toFixed(0)}
                      </strong>
                    </div>

                  </div>

                  <div className="order-card-bottom">

                    <div className="order-delivery-info">
                      <span>
                        Delivery Fee
                      </span>

                      <strong>
                        ₹
                        {Number(
                          order.delivery_fee || 0
                        ).toFixed(0)}
                      </strong>
                    </div>

                    <button
                      onClick={() =>
                        goOrderDetails(
                          order.order_id
                        )
                      }
                    >
                      View Details
                      <ChevronRight
                        size={17}
                      />
                    </button>

                  </div>

                </article>
              ))}

            </div>
          )}

      </main>
    </div>
  );
}

export default MyOrders;