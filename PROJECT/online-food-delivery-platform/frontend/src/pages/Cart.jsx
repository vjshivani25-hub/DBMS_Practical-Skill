import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  CreditCard,
} from "lucide-react";

import { getRestaurantById } from "../services/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";

function Cart({
  cart,
  setCart,
  goMenu,
  goCheckout,
}) {
  const [restaurant, setRestaurant] = useState(null);
  const [loadingFee, setLoadingFee] = useState(false);

  /*
  ----------------------------------------------------
  FETCH RESTAURANT DELIVERY FEE
  ----------------------------------------------------
  */

  useEffect(() => {
    const restaurantId = cart?.[0]?.restaurant_id;

    if (!restaurantId) {
      setRestaurant(null);
      return;
    }

    const loadRestaurant = async () => {
      try {
        setLoadingFee(true);

        const data = await getRestaurantById(
          restaurantId
        );

        if (data.success) {
          setRestaurant(data.restaurant);
        }
      } catch (error) {
        console.error(
          "Failed to load restaurant fee:",
          error
        );
      } finally {
        setLoadingFee(false);
      }
    };

    loadRestaurant();
  }, [cart]);

  /*
  ----------------------------------------------------
  QUANTITY
  ----------------------------------------------------
  */

  const updateQuantity = (id, amount) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity:
                  item.quantity + amount,
              }
            : item
        )
        .filter(
          (item) => item.quantity > 0
        )
    );
  };

  /*
  ----------------------------------------------------
  REMOVE ITEM
  ----------------------------------------------------
  */

  const removeItem = (id) => {
    setCart((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  };

  /*
  ----------------------------------------------------
  BILL
  ----------------------------------------------------
  */

  const subtotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) *
        Number(item.quantity),
    0
  );

  const deliveryFee =
    cart.length > 0
      ? Number(
          restaurant?.delivery_fee || 0
        )
      : 0;

  const total =
    subtotal + deliveryFee;

  /*
  ----------------------------------------------------
  CHECKOUT
  ----------------------------------------------------
  */

  const handleCheckout = () => {
    const user = JSON.parse(
      localStorage.getItem(
        "foodflow_user"
      ) || "null"
    );

    if (!user) {
      alert(
        "Please login before checkout."
      );
      return;
    }

    if (cart.length === 0) {
      return;
    }

    if (goCheckout) {
      goCheckout();
    }
  };

  return (
    <div className="cart-page">
      <div className="cart-topbar">
        <button onClick={goMenu}>
          <ArrowLeft size={19} />
          Continue Shopping
        </button>
      </div>

      <div className="cart-container">
        {/* LEFT SIDE */}

        <div className="cart-main">
          <p className="section-label">
            YOUR ORDER
          </p>

          <h1>Shopping Cart</h1>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <span>🛒</span>

              <h2>
                Your cart is empty
              </h2>

              <p>
                Add something delicious
                from the menu.
              </p>

              <button
                onClick={goMenu}
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div
                  className="cart-item"
                  key={item.id}
                >
                  <div className="cart-food-image">
                    <img
                      src={
                        item.image ||
                        item.image_url ||
                        FALLBACK_IMAGE
                      }
                      alt={item.name}
                      onError={(
                        event
                      ) => {
                        event.currentTarget.src =
                          FALLBACK_IMAGE;
                      }}
                    />
                  </div>

                  <div className="cart-item-details">
                    <h3>
                      {item.name}
                    </h3>

                    <p>
                      ₹
                      {Number(
                        item.price
                      ).toFixed(0)}
                    </p>

                    <div className="cart-controls">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            -1
                          )
                        }
                      >
                        <Minus
                          size={15}
                        />
                      </button>

                      <strong>
                        {item.quantity}
                      </strong>

                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            1
                          )
                        }
                      >
                        <Plus
                          size={15}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-right">
                    <strong>
                      ₹
                      {(
                        Number(
                          item.price
                        ) *
                        Number(
                          item.quantity
                        )
                      ).toFixed(0)}
                    </strong>

                    <button
                      onClick={() =>
                        removeItem(
                          item.id
                        )
                      }
                      className="delete-btn"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2
                        size={17}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE */}

        {cart.length > 0 && (
          <aside className="bill-card">
            <h2>Bill Details</h2>

            <div>
              <span>
                Item Total
              </span>

              <strong>
                ₹{subtotal.toFixed(0)}
              </strong>
            </div>

            <div>
              <span>
                Delivery Fee
              </span>

              <strong>
                {loadingFee
                  ? "Loading..."
                  : `₹${deliveryFee.toFixed(
                      0
                    )}`}
              </strong>
            </div>

            <hr />

            <div className="grand-total">
              <span>Total</span>

              <strong>
                ₹{total.toFixed(0)}
              </strong>
            </div>

            <button
              className="checkout-btn"
              onClick={
                handleCheckout
              }
            >
              <CreditCard
                size={18}
              />

              Proceed to Checkout
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}

export default Cart;