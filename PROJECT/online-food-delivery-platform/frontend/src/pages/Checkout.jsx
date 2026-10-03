import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Plus,
  CreditCard,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import {
  getUserAddresses,
  createAddress,
  createOrder,
  getRestaurantById,
} from "../services/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";

function Checkout({
  cart,
  goCart,
  goHome,
  onOrderPlaced,
}) {
  const [user, setUser] = useState(null);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");

  const [showAddressForm, setShowAddressForm] = useState(false);

  const [addressForm, setAddressForm] = useState({
    address_line: "",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "",
  });

  const [restaurant, setRestaurant] = useState(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState(null);

  // ================================
  // LOAD LOGGED-IN USER
  // ================================

  useEffect(() => {
    try {
      const storedUser = JSON.parse(
        localStorage.getItem("foodflow_user") || "null"
      );

      setUser(storedUser);
    } catch (error) {
      console.error("Failed to read logged-in user:", error);
      setUser(null);
    }
  }, []);

  // ================================
  // LOAD USER ADDRESSES
  // ================================

  useEffect(() => {
    if (!user?.user_id) {
      setLoadingAddresses(false);
      return;
    }

    const loadAddresses = async () => {
      try {
        setLoadingAddresses(true);
        setError("");

        const data = await getUserAddresses(user.user_id);

        if (data.success) {
          const userAddresses = data.addresses || [];

          setAddresses(userAddresses);

          if (userAddresses.length > 0) {
            setSelectedAddress(
              String(userAddresses[0].address_id)
            );
          }
        } else {
          setError(
            data.message || "Failed to load addresses."
          );
        }
      } catch (error) {
        console.error("Load addresses error:", error);

        setError("Unable to load delivery addresses.");
      } finally {
        setLoadingAddresses(false);
      }
    };

    loadAddresses();
  }, [user]);

  // ================================
  // LOAD RESTAURANT DETAILS
  // ================================

  useEffect(() => {
    const restaurantId = cart?.[0]?.restaurant_id;

    if (!restaurantId) {
      setRestaurant(null);
      setLoadingRestaurant(false);
      return;
    }

    const loadRestaurant = async () => {
      try {
        setLoadingRestaurant(true);
        setError("");

        const data = await getRestaurantById(restaurantId);

        if (data.success) {
          setRestaurant(data.restaurant);
        } else {
          setRestaurant(null);

          setError(
            data.message ||
              "Failed to load restaurant details."
          );
        }
      } catch (error) {
        console.error("Restaurant loading error:", error);

        setRestaurant(null);

        setError(
          "Unable to load restaurant delivery fee."
        );
      } finally {
        setLoadingRestaurant(false);
      }
    };

    loadRestaurant();
  }, [cart]);

  // ================================
  // ADDRESS FORM
  // ================================

  const handleAddressChange = (event) => {
    const { name, value } = event.target;

    setAddressForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ================================
  // ADD ADDRESS
  // ================================

  const handleAddAddress = async (event) => {
    event.preventDefault();

    if (!user?.user_id) {
      setError("Please login before adding an address.");
      return;
    }

    if (
      !addressForm.address_line.trim() ||
      !addressForm.city.trim() ||
      !addressForm.state.trim() ||
      !addressForm.pincode.trim()
    ) {
      setError("Please fill all address fields.");
      return;
    }

    if (!/^\d{6}$/.test(addressForm.pincode.trim())) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    try {
      setError("");

      const data = await createAddress({
        user_id: user.user_id,
        address_line: addressForm.address_line.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim(),
        latitude: null,
        longitude: null,
      });

      if (!data.success) {
        setError(
          data.message || "Failed to add address."
        );
        return;
      }

      const newAddress = data.address;

      setAddresses((current) => [
        newAddress,
        ...current,
      ]);

      setSelectedAddress(
        String(newAddress.address_id)
      );

      setAddressForm({
        address_line: "",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "",
      });

      setShowAddressForm(false);
    } catch (error) {
      console.error("Create address error:", error);

      setError("Unable to add address.");
    }
  };

  // ================================
  // RESTAURANT CHECK
  // ================================

  const restaurantId = cart?.[0]?.restaurant_id;

  const allSameRestaurant = cart.every(
    (item) =>
      Number(item.restaurant_id) ===
      Number(restaurantId)
  );

  // ================================
  // BILL CALCULATION
  // ================================

  const subtotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) * Number(item.quantity),
    0
  );

  const deliveryFee =
    cart.length > 0 && restaurant
      ? Number(restaurant.delivery_fee || 0)
      : 0;

  const total = subtotal + deliveryFee;

  // ================================
  // PLACE ORDER
  // ================================

  const handlePlaceOrder = async () => {
    if (!user?.user_id) {
      setError(
        "Please login before placing an order."
      );
      return;
    }

    if (cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!restaurantId) {
      setError("Restaurant information is missing.");
      return;
    }

    if (!allSameRestaurant) {
      setError(
        "You can order items from only one restaurant at a time."
      );
      return;
    }

    if (!selectedAddress) {
      setError(
        "Please select a delivery address."
      );
      return;
    }

    if (!restaurant) {
      setError(
        "Restaurant details are still loading. Please wait."
      );
      return;
    }

    try {
      setPlacingOrder(true);
      setError("");

      const orderData = {
        user_id: Number(user.user_id),

        restaurant_id: Number(restaurantId),

        address_id: Number(selectedAddress),

        items: cart.map((item) => ({
          item_id: Number(item.item_id || item.id),
          quantity: Number(item.quantity),
        })),
      };

      console.log(
        "FoodFlow order request:",
        orderData
      );

      const data = await createOrder(orderData);

      console.log(
        "FoodFlow order response:",
        data
      );

      if (!data.success) {
        setError(
          data.message ||
            "Failed to place order."
        );
        return;
      }

      setSuccessOrder(data.order);

      if (onOrderPlaced) {
        onOrderPlaced(data.order);
      }
    } catch (error) {
      console.error(
        "Place order error:",
        error
      );

      setError(
        "Unable to place order. Please check the backend server."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // ================================
  // SUCCESS SCREEN
  // ================================

  if (successOrder) {
    return (
      <div className="checkout-page">
        <div className="checkout-success">
          <CheckCircle2 size={72} />

          <p className="section-label">
            ORDER CONFIRMED
          </p>

          <h1>
            Order Placed Successfully! 🎉
          </h1>

          <p>
            Your FoodFlow order has been
            placed successfully.
          </p>

          <div className="success-order-card">
            <div>
              <span>Order ID</span>

              <strong>
                #{successOrder.order_id}
              </strong>
            </div>

            <div>
              <span>Restaurant</span>

              <strong>
                {restaurant?.name ||
                  "FoodFlow Restaurant"}
              </strong>
            </div>

            <div>
              <span>Total</span>

              <strong>
                ₹
                {Number(
                  successOrder.total_amount ||
                    total
                ).toFixed(0)}
              </strong>
            </div>

            <div>
              <span>Status</span>

              <strong>
                {successOrder.status ||
                  "PLACED"}
              </strong>
            </div>
          </div>

          <div className="success-actions">
            <button onClick={goHome}>
              Continue Shopping
            </button>

            <button
              className="secondary-btn"
              onClick={goHome}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================================
  // MAIN CHECKOUT
  // ================================

  return (
    <div className="checkout-page">

      {/* TOP BAR */}

      <div className="checkout-topbar">
        <button onClick={goCart}>
          <ArrowLeft size={19} />
          Back to Cart
        </button>
      </div>

      <div className="checkout-container">

        {/* LEFT SIDE */}

        <main className="checkout-main">

          <p className="section-label">
            SECURE CHECKOUT
          </p>

          <h1>
            Complete Your Order
          </h1>

          {error && (
            <div className="checkout-error">
              {error}
            </div>
          )}

          {/* STEP 1 */}

          <section className="checkout-section">

            <div className="checkout-section-title">

              <div>
                <span className="checkout-step">
                  1
                </span>

                <div>
                  <h2>
                    Delivery Address
                  </h2>

                  <p>
                    Where should we
                    deliver your order?
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="add-address-button"
                onClick={() =>
                  setShowAddressForm(
                    (current) => !current
                  )
                }
              >
                <Plus size={17} />
                Add Address
              </button>
            </div>

            {/* ADD ADDRESS FORM */}

            {showAddressForm && (
              <form
                className="address-form"
                onSubmit={handleAddAddress}
              >
                <input
                  type="text"
                  name="address_line"
                  placeholder="House / Flat / Street Address"
                  value={addressForm.address_line}
                  onChange={handleAddressChange}
                />

                <div className="address-form-row">

                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={addressForm.city}
                    onChange={handleAddressChange}
                  />

                  <input
                    type="text"
                    name="state"
                    placeholder="State"
                    value={addressForm.state}
                    onChange={handleAddressChange}
                  />

                  <input
                    type="text"
                    name="pincode"
                    placeholder="Pincode"
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={handleAddressChange}
                  />

                </div>

                <button
                  type="submit"
                  className="save-address-button"
                >
                  Save Address
                </button>
              </form>
            )}

            {/* ADDRESS LIST */}

            {loadingAddresses ? (
              <div className="checkout-loading">
                <Loader2
                  size={22}
                  className="spin"
                />
                Loading addresses...
              </div>
            ) : addresses.length === 0 ? (
              <div className="no-address">
                <MapPin size={24} />

                <p>
                  No saved address found.
                  Please add a delivery
                  address.
                </p>
              </div>
            ) : (
              <div className="address-list">

                {addresses.map((address) => (
                  <label
                    key={address.address_id}
                    className={`address-card ${
                      String(selectedAddress) ===
                      String(address.address_id)
                        ? "selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={address.address_id}
                      checked={
                        String(selectedAddress) ===
                        String(address.address_id)
                      }
                      onChange={(event) =>
                        setSelectedAddress(
                          event.target.value
                        )
                      }
                    />

                    <div>
                      <strong>
                        <MapPin size={17} />
                        Delivery Address
                      </strong>

                      <p>
                        {address.address_line}
                        <br />
                        {address.city},{" "}
                        {address.state} -{" "}
                        {address.pincode}
                      </p>
                    </div>
                  </label>
                ))}

              </div>
            )}
          </section>

          {/* STEP 2 */}

          <section className="checkout-section">

            <div className="checkout-section-title">

              <div>
                <span className="checkout-step">
                  2
                </span>

                <div>
                  <h2>
                    Your Order
                  </h2>

                  <p>
                    {cart.length}{" "}
                    item
                    {cart.length !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>

            </div>

            <div className="checkout-items">

              {cart.map((item) => (
                <div
                  className="checkout-item"
                  key={item.id}
                >
                  <img
                    src={
                      item.image ||
                      item.image_url ||
                      FALLBACK_IMAGE
                    }
                    alt={item.name}
                    onError={(event) => {
                      event.currentTarget.src =
                        FALLBACK_IMAGE;
                    }}
                  />

                  <div className="checkout-item-info">

                    <h3>
                      {item.name}
                    </h3>

                    <p>
                      ₹
                      {Number(
                        item.price
                      ).toFixed(0)}{" "}
                      ×{" "}
                      {item.quantity}
                    </p>

                  </div>

                  <strong>
                    ₹
                    {(
                      Number(item.price) *
                      Number(item.quantity)
                    ).toFixed(0)}
                  </strong>
                </div>
              ))}

            </div>
          </section>

          {/* STEP 3 */}

          <section className="checkout-section">

            <div className="checkout-section-title">

              <div>
                <span className="checkout-step">
                  3
                </span>

                <div>
                  <h2>
                    Payment Method
                  </h2>

                  <p>
                    Select your preferred
                    payment method.
                  </p>
                </div>
              </div>

            </div>

            <div className="payment-method-card">

              <CreditCard size={22} />

              <div>
                <strong>
                  Online Payment
                </strong>

                <p>
                  Razorpay payment
                  integration will be
                  connected next.
                </p>
              </div>

              <span>
                Secure
              </span>

            </div>
          </section>

        </main>

        {/* RIGHT SIDE - BILL */}

        <aside className="checkout-bill">

          <h2>
            Bill Details
          </h2>

          {/* RESTAURANT */}

          {restaurant && (
            <div className="bill-restaurant">

              <span>
                Restaurant
              </span>

              <strong>
                {restaurant.name}
              </strong>

            </div>
          )}

          {/* ITEM TOTAL */}

          <div className="checkout-bill-row">

            <span>
              Item Total
            </span>

            <strong>
              ₹{subtotal.toFixed(0)}
            </strong>

          </div>

          {/* DELIVERY FEE */}

          <div className="checkout-bill-row">

            <span>
              Delivery Fee
            </span>

            <strong>
              {loadingRestaurant
                ? "Loading..."
                : `₹${deliveryFee.toFixed(0)}`}
            </strong>

          </div>

          <hr />

          {/* TOTAL */}

          <div className="checkout-total">

            <span>
              Total
            </span>

            <strong>
              ₹{total.toFixed(0)}
            </strong>

          </div>

          {/* PLACE ORDER */}

          <button
            type="button"
            className="place-order-button"
            onClick={handlePlaceOrder}
            disabled={
              placingOrder ||
              loadingRestaurant ||
              !restaurant ||
              !selectedAddress ||
              cart.length === 0 ||
              !allSameRestaurant
            }
          >
            {placingOrder ? (
              <>
                <Loader2
                  size={19}
                  className="spin"
                />
                Placing Order...
              </>
            ) : (
              <>
                <CreditCard size={19} />
                Place Order · ₹
                {total.toFixed(0)}
              </>
            )}
          </button>

          <p className="secure-note">
            🔒 Your order information
            is securely processed by
            FoodFlow.
          </p>

        </aside>

      </div>
    </div>
  );
}

export default Checkout;