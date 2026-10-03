import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  ArrowLeft,
  Copy,
  Users,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Utensils,
} from "lucide-react";

import {
  getRestaurants,
  getRestaurantMenu,
  createGroupOrder,
  joinGroupOrder,
  getGroupOrder,
  addGroupCartItem,
  updateGroupCartItem,
  deleteGroupCartItem,
  getGroupSplitBill,
  initializeGroupPayments,
  demoPayGroupPayment,
} from "../services/api";

import "./GroupOrder.css";

const SOCKET_URL = "http://localhost:5000";

function GroupOrder({ user, goHome }) {
  // ==========================================================
  // BASIC STATE
  // ==========================================================

  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] =
    useState("");

  const [menuItems, setMenuItems] = useState([]);

  const [groupCodeInput, setGroupCodeInput] = useState("");
  const [groupCode, setGroupCode] = useState("");

  const [group, setGroup] = useState(null);
  const [splitBill, setSplitBill] = useState(null);

  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [activeTab, setActiveTab] = useState("cart");

  // ==========================================================
  // LOAD RESTAURANTS
  // ==========================================================

  useEffect(() => {
    async function loadRestaurants() {
      try {
        setError("");

        const data = await getRestaurants();

        if (data?.success) {
          const restaurantList = data.restaurants || [];

          setRestaurants(restaurantList);

          if (
            restaurantList.length > 0 &&
            !selectedRestaurantId
          ) {
            setSelectedRestaurantId(
              String(restaurantList[0].restaurant_id)
            );
          }
        } else {
          setRestaurants([]);
          setError(
            data?.message || "Unable to load restaurants."
          );
        }
      } catch (err) {
        console.error("Group restaurant error:", err);
        setError("Unable to load restaurants.");
      }
    }

    loadRestaurants();
  }, []);

  // ==========================================================
  // LOAD RESTAURANT MENU
  // ==========================================================

  useEffect(() => {
    if (!selectedRestaurantId) {
      setMenuItems([]);
      return;
    }

    async function loadMenu() {
      try {
        setMenuLoading(true);

        const data = await getRestaurantMenu(
          Number(selectedRestaurantId)
        );

        console.log(
          "GROUP ORDER MENU RESPONSE:",
          data
        );

        if (data?.success) {
          const items =
            data.menuItems ||
            data.menu ||
            data.items ||
            [];

          const restaurantItems = items.filter((item) => {
            if (
              item.restaurant_id === undefined ||
              item.restaurant_id === null
            ) {
              return true;
            }

            return (
              Number(item.restaurant_id) ===
              Number(selectedRestaurantId)
            );
          });

          const availableItems =
            restaurantItems.filter((item) => {
              if (
                item.is_available === undefined ||
                item.is_available === null
              ) {
                return true;
              }

              return Number(item.is_available) === 1;
            });

          setMenuItems(availableItems);
        } else {
          setMenuItems([]);
        }
      } catch (err) {
        console.error(
          "Group menu error:",
          err
        );

        setMenuItems([]);
      } finally {
        setMenuLoading(false);
      }
    }

    loadMenu();
  }, [selectedRestaurantId]);

  // ==========================================================
  // LOAD GROUP
  // ==========================================================

  async function loadGroup(code = groupCode) {
    if (!code) return;

    try {
      const data = await getGroupOrder(code);

      console.log(
        "GROUP ORDER RESPONSE:",
        data
      );

      if (data?.success) {
        const loadedGroup = data.group;

        setGroup(loadedGroup);

        setGroupCode(
          loadedGroup.group_code
        );

        if (loadedGroup.restaurant_id) {
          setSelectedRestaurantId(
            String(
              loadedGroup.restaurant_id
            )
          );
        }

        await loadSplitBill(
          loadedGroup.group_code
        );
      } else {
        setError(
          data?.message ||
            "Unable to load group order."
        );
      }
    } catch (err) {
      console.error(
        "Group load error:",
        err
      );

      setError(
        "Unable to connect to Group Order."
      );
    }
  }

  // ==========================================================
  // LOAD SPLIT BILL
  // ==========================================================

  async function loadSplitBill(code = groupCode) {
    if (!code) return;

    try {
      const data =
        await getGroupSplitBill(code);

      if (data?.success) {
        setSplitBill(data);
      }
    } catch (err) {
      console.error(
        "Split bill error:",
        err
      );
    }
  }

  // ==========================================================
  // SOCKET.IO
  // ==========================================================

  useEffect(() => {
    if (!groupCode) return;

    const socket = io(SOCKET_URL, {
      transports: [
        "websocket",
        "polling",
      ],
    });

    const refreshGroup = () => {
      loadGroup(groupCode);
    };

    socket.on(
      "group-payment-updated",
      refreshGroup
    );

    socket.on(
      "group-cart-updated",
      refreshGroup
    );

    socket.on(
      "group-order-updated",
      refreshGroup
    );

    return () => {
      socket.off(
        "group-payment-updated",
        refreshGroup
      );

      socket.off(
        "group-cart-updated",
        refreshGroup
      );

      socket.off(
        "group-order-updated",
        refreshGroup
      );

      socket.disconnect();
    };
  }, [groupCode]);

  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    if (!groupCode) return;

    const timer = setInterval(() => {
      loadGroup(groupCode);
    }, 5000);

    return () => {
      clearInterval(timer);
    };
  }, [groupCode]);

  // ==========================================================
  // CREATE GROUP
  // ==========================================================

  async function handleCreateGroup() {
    if (!user) {
      setError("Please login first.");
      return;
    }

    if (!selectedRestaurantId) {
      setError(
        "Please select a restaurant."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data =
        await createGroupOrder(
          user.user_id,
          Number(selectedRestaurantId)
        );

      if (!data?.success) {
        setError(
          data?.message ||
            "Unable to create group."
        );
        return;
      }

      const newCode =
        data.group?.group_code ||
        data.groupCode;

      if (!newCode) {
        setError(
          "Group created but group code was not returned."
        );
        return;
      }

      setGroupCode(newCode);

      setMessage(
        `Group created successfully! Code: ${newCode}`
      );

      await loadGroup(newCode);

      setActiveTab("menu");
    } catch (err) {
      console.error(
        "Create group error:",
        err
      );

      setError(
        "Unable to create group order."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // JOIN GROUP
  // ==========================================================

  async function handleJoinGroup() {
    if (!user) {
      setError("Please login first.");
      return;
    }

    const code =
      groupCodeInput
        .trim()
        .toUpperCase();

    if (!code) {
      setError(
        "Enter a group code."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data =
        await joinGroupOrder(
          code,
          user.user_id
        );

      if (!data?.success) {
        setError(
          data?.message ||
            "Unable to join group."
        );
        return;
      }

      setGroupCode(code);

      setMessage(
        "You joined the group successfully!"
      );

      await loadGroup(code);

      setActiveTab("menu");
    } catch (err) {
      console.error(
        "Join group error:",
        err
      );

      setError(
        "Unable to join group."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // ADD ITEM TO SHARED CART
  // ==========================================================

  async function handleAddItem(item) {
    console.log(
      "========== ADD FOOD CLICK =========="
    );

    console.log(
      "Group Code:",
      groupCode
    );

    console.log(
      "User:",
      user
    );

    console.log(
      "User ID:",
      user?.user_id
    );

    console.log(
      "Item:",
      item
    );

    console.log(
      "Item ID:",
      item?.item_id
    );

    if (!groupCode) {
      setError(
        "Create or join a group first."
      );
      return;
    }

    if (!user?.user_id) {
      setError(
        "User ID is missing. Please login again."
      );
      return;
    }

    const itemId = Number(
      item?.item_id ?? item?.id
    );

    if (!itemId) {
      setError(
        "Food item ID is missing."
      );
      return;
    }

    try {
      setError("");
      setMessage("");

      const payload = {
        userId: Number(user.user_id),
        itemId,
        quantity: 1,
      };

      console.log(
        "POST PAYLOAD:",
        payload
      );

      const data =
        await addGroupCartItem(
          groupCode,
          Number(user.user_id),
          itemId,
          1
        );

      console.log(
        "ADD FOOD RESPONSE:",
        data
      );

      if (!data?.success) {
        console.error(
          "❌ ADD FOOD FAILED:",
          data?.message,
          data
        );

        setError(
          data?.message ||
            "Food could not be added to shared cart."
        );

        return;
      }

      console.log(
        "✅ FOOD ADDED SUCCESSFULLY"
      );

      setMessage(
        `${item.name} added to shared cart!`
      );

      await loadGroup(groupCode);

      await loadSplitBill(
        groupCode
      );

      setActiveTab("cart");
    } catch (err) {
      console.error(
        "❌ ADD FOOD ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to add food to shared cart."
      );
    }
  }

  // ==========================================================
  // UPDATE QUANTITY
  // ==========================================================

  async function changeQuantity(
    cartItem,
    newQuantity
  ) {
    if (newQuantity <= 0) {
      await handleDeleteItem(
        cartItem
      );
      return;
    }

    try {
      setError("");

      const data =
        await updateGroupCartItem(
          groupCode,
          cartItem.group_cart_item_id,
          user.user_id,
          newQuantity
        );

      if (!data?.success) {
        setError(
          data?.message ||
            "Unable to update quantity."
        );
        return;
      }

      await loadGroup(groupCode);
    } catch (err) {
      console.error(
        "Update group item error:",
        err
      );

      setError(
        "Unable to update quantity."
      );
    }
  }

  // ==========================================================
  // DELETE ITEM
  // ==========================================================

  async function handleDeleteItem(
    cartItem
  ) {
    try {
      setError("");

      const data =
        await deleteGroupCartItem(
          groupCode,
          cartItem.group_cart_item_id,
          user.user_id
        );

      if (!data?.success) {
        setError(
          data?.message ||
            "Unable to remove item."
        );
        return;
      }

      await loadGroup(groupCode);
    } catch (err) {
      console.error(
        "Delete group item error:",
        err
      );

      setError(
        "Unable to remove item."
      );
    }
  }

  // ==========================================================
// INITIALIZE / OPEN SPLIT BILL
// ==========================================================

async function handleInitializePayments() {
  try {
    setLoading(true);
    setError("");
    setMessage("");

    // --------------------------------------------------------
    // FIRST: CHECK WHETHER SPLIT PAYMENTS ALREADY EXIST
    // --------------------------------------------------------

    const existingSplitBill =
      await getGroupSplitBill(groupCode);

    if (
      existingSplitBill?.success &&
      Array.isArray(existingSplitBill.payments) &&
      existingSplitBill.payments.length > 0
    ) {
      // Payments are already initialized.
      // Just load the latest data and open Split Bill.

      setSplitBill(existingSplitBill);

      await loadGroup(groupCode);

      setActiveTab("payment");

      return;
    }

    // --------------------------------------------------------
    // NO PAYMENTS YET
    // INITIALIZE THEM
    // --------------------------------------------------------

    const data =
      await initializeGroupPayments(
        groupCode
      );

    if (!data?.success) {
      setError(
        data?.message ||
          "Unable to initialize payments."
      );

      return;
    }

    setMessage(
      "Split payments initialized successfully!"
    );

    // --------------------------------------------------------
    // LOAD UPDATED GROUP + SPLIT BILL
    // --------------------------------------------------------

    await loadGroup(groupCode);

    const updatedSplitBill =
      await getGroupSplitBill(groupCode);

    if (updatedSplitBill?.success) {
      setSplitBill(updatedSplitBill);
    }

    // --------------------------------------------------------
    // OPEN SPLIT BILL TAB
    // --------------------------------------------------------

    setActiveTab("payment");

  } catch (err) {
    console.error(
      "Payment initialization error:",
      err
    );

    setError(
      "Unable to open Split Bill."
    );
  } finally {
    setLoading(false);
  }
}
  // ==========================================================
  // DEMO PAYMENT
  // ==========================================================

  async function handleDemoPayment(
    paymentId
  ) {
    try {
      setPaymentLoading(
        paymentId
      );

      setError("");

      const data =
        await demoPayGroupPayment(
          groupCode,
          paymentId
        );

      if (!data?.success) {
        setError(
          data?.message ||
            "Payment failed."
        );
        return;
      }

      setMessage(
        `Demo payment successful: ₹${data.payment?.amount}`
      );

      await loadGroup(groupCode);

      await loadSplitBill(
        groupCode
      );
    } catch (err) {
      console.error(
        "Demo payment error:",
        err
      );

      setError(
        "Unable to complete demo payment."
      );
    } finally {
      setPaymentLoading(null);
    }
  }

  // ==========================================================
  // COPY GROUP CODE
  // ==========================================================

  async function copyGroupCode() {
    try {
      await navigator.clipboard.writeText(
        groupCode
      );

      setMessage(
        "Group code copied!"
      );
    } catch {
      setMessage(
        `Group Code: ${groupCode}`
      );
    }
  }

  // ==========================================================
  // CALCULATIONS
  // ==========================================================

  const cartItems =
    group?.cartItems ||
    group?.cart ||
    [];

  const cartTotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total +
        Number(
          item.unit_price || 0
        ) *
          Number(
            item.quantity || 0
          ),
      0
    );
  }, [cartItems]);

  const payments =
    splitBill?.payments || [];

  const paidCount =
    payments.filter(
      (payment) =>
        payment.payment_status ===
        "PAID"
    ).length;

  const pendingCount =
    payments.filter(
      (payment) =>
        payment.payment_status !==
        "PAID"
    ).length;

  const groupPlaced =
    group?.status === "PLACED";

  // ==========================================================
  // NOT LOGGED IN
  // ==========================================================

  if (!user) {
    return (
      <div className="group-page">
        <div className="group-topbar">
          <button
            onClick={goHome}
            className="back-button"
          >
            <ArrowLeft size={18} />
            Home
          </button>

          <div className="group-brand">
            🍽️ FoodFlow
          </div>
        </div>

        <div className="group-login-message">
          <div className="big-icon">
            👥
          </div>

          <h1>
            Login to start a Group Order
          </h1>

          <p>
            Create a shared cart,
            invite friends and
            split the bill separately.
          </p>

          <button
            className="primary-button"
            onClick={() => {
              window.location.hash =
                "login";
            }}
          >
            Login to Continue
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN PAGE
  // ==========================================================

  return (
    <div className="group-page">

      {/* HEADER */}

      <header className="group-topbar">
        <button
          onClick={goHome}
          className="back-button"
        >
          <ArrowLeft size={18} />
          Home
        </button>

        <div className="group-brand">
          🍽️ FoodFlow
        </div>

        <div className="group-user">
          Hi, {user.name}
        </div>
      </header>

      {/* HERO */}

      <section className="group-hero">
        <div>
          <span className="group-label">
            FOODFLOW SPECIAL
          </span>

          <h1>
            Order together.
            <span>
              Pay separately.
            </span>
          </h1>

          <p>
            Build one shared cart
            with your friends and
            automatically split the
            bill.
          </p>
        </div>

        <div className="group-hero-icon">
          👥
        </div>
      </section>

      {/* ALERTS */}

      {error && (
        <div className="group-alert error">
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div className="group-alert success">
          ✅ {message}
        </div>
      )}

      {/* CREATE / JOIN */}

      {!groupCode && (
        <section className="group-start-grid">

          {/* CREATE GROUP */}

          <div className="group-start-card">
            <div className="start-icon">
              ✨
            </div>

            <h2>
              Create a Group
            </h2>

            <p>
              Choose a restaurant and
              invite your friends.
            </p>

            <label>
              Select Restaurant
            </label>

            <select
              value={
                selectedRestaurantId
              }
              onChange={(event) => {
                setSelectedRestaurantId(
                  event.target.value
                );
              }}
            >
              <option value="">
                Select Restaurant
              </option>

              {restaurants.map(
                (restaurant) => (
                  <option
                    key={
                      restaurant.restaurant_id
                    }
                    value={
                      restaurant.restaurant_id
                    }
                  >
                    {restaurant.name}
                  </option>
                )
              )}
            </select>

            <button
              className="primary-button"
              onClick={
                handleCreateGroup
              }
              disabled={
                loading ||
                !selectedRestaurantId
              }
            >
              {loading
                ? "Creating..."
                : "Create Group"}
            </button>
          </div>

          {/* JOIN GROUP */}

          <div className="group-start-card">
            <div className="start-icon">
              🔗
            </div>

            <h2>
              Join a Group
            </h2>

            <p>
              Enter the code shared
              by your friend.
            </p>

            <label>
              Group Code
            </label>

            <input
              value={
                groupCodeInput
              }
              onChange={(event) =>
                setGroupCodeInput(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="Example: FGBBNL"
              maxLength={20}
            />

            <button
              className="secondary-button"
              onClick={
                handleJoinGroup
              }
              disabled={loading}
            >
              {loading
                ? "Joining..."
                : "Join Group"}
            </button>
          </div>
        </section>
      )}

      {/* ACTIVE GROUP */}

      {groupCode && group && (
        <>
          {/* GROUP HEADER */}

          <section className="active-group-header">
            <div>
              <span className="small-label">
                GROUP ORDER
              </span>

              <h2>
                {group.restaurant_name ||
                  "FoodFlow Group"}
              </h2>

              <div className="group-code-box">
                <span>
                  Group Code:
                </span>

                <strong>
                  {groupCode}
                </strong>

                <button
                  onClick={
                    copyGroupCode
                  }
                  title="Copy Group Code"
                >
                  <Copy size={17} />
                </button>
              </div>
            </div>

            <div
              className={`status-badge ${
                groupPlaced
                  ? "placed"
                  : "live"
              }`}
            >
              {groupPlaced
                ? "ORDER PLACED"
                : "● LIVE"}
            </div>
          </section>

          {/* MEMBERS */}

          <section className="members-section">
            <div className="section-title-row">
              <div>
                <span className="small-label">
                  PEOPLE
                </span>

                <h2>
                  Group Members
                </h2>
              </div>

              <span className="member-count">
                <Users size={17} />

                {group.members?.length ||
                  0}{" "}
                members
              </span>
            </div>

            <div className="members-grid">
              {group.members?.map(
                (member) => (
                  <div
                    className="member-card"
                    key={
                      member.group_member_id
                    }
                  >
                    <div className="member-avatar">
                      {Number(
                        member.user_id
                      ) ===
                      Number(
                        user.user_id
                      )
                        ? "👑"
                        : "👤"}
                    </div>

                    <div>
                      <strong>
                        {member.user_name ||
                          member.name ||
                          "Member"}
                      </strong>

                      <small>
                        {Number(
                          member.user_id
                        ) ===
                        Number(
                          user.user_id
                        )
                          ? "You"
                          : "Member"}
                      </small>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          {/* TABS */}

          <div className="group-tabs">
            <button
              className={
                activeTab === "cart"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("cart")
              }
            >
              <ShoppingCart size={18} />
              Shared Cart
            </button>

            <button
              className={
                activeTab === "menu"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("menu")
              }
            >
              <Utensils size={18} />
              Add Food
            </button>

            <button
              className={
                activeTab === "payment"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("payment")
              }
            >
              <CreditCard size={18} />
              Split Bill
            </button>
          </div>

          {/* ==================================================
              MENU
          ================================================== */}

          {activeTab === "menu" && (
            <section className="group-content-section">

              <div className="section-title-row">
                <div>
                  <span className="small-label">
                    {group.restaurant_name
                      ? `${group.restaurant_name} MENU`
                      : "MENU"}
                  </span>

                  <h2>
                    Add something delicious
                  </h2>

                  <p
                    style={{
                      marginTop: "6px",
                      color: "#777",
                    }}
                  >
                    Choose food from{" "}
                    <strong>
                      {group.restaurant_name ||
                        "this restaurant"}
                    </strong>
                  </p>
                </div>

                <button
                  className="refresh-button"
                  onClick={() => {
                    if (
                      selectedRestaurantId
                    ) {
                      setSelectedRestaurantId(
                        String(
                          selectedRestaurantId
                        )
                      );
                    }
                  }}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              {menuLoading ? (
                <div className="empty-state">
                  <RefreshCw
                    size={35}
                  />

                  <h3>
                    Loading restaurant menu...
                  </h3>

                  <p>
                    Getting delicious food
                    from{" "}
                    {group.restaurant_name ||
                      "the restaurant"}.
                  </p>
                </div>
              ) : menuItems.length ===
                0 ? (
                <div className="empty-state">
                  <Utensils size={45} />

                  <h3>
                    No food items found
                  </h3>

                  <p>
                    No available menu items
                    were found for{" "}
                    {group.restaurant_name ||
                      "this restaurant"}.
                  </p>
                </div>
              ) : (
                <div className="group-menu-grid">
                  {menuItems.map(
                    (item) => (
                      <div
                        className="group-menu-card"
                        key={
                          item.item_id
                        }
                      >

                        {/* FOOD IMAGE */}

                        <div className="menu-food-image">
                          {item.image_url ? (
                            <img
                              src={
                                item.image_url
                              }
                              alt={
                                item.name
                              }
                              onError={(
                                event
                              ) => {
                                event.currentTarget.style.display =
                                  "none";

                                event.currentTarget.parentElement.classList.add(
                                  "image-fallback"
                                );
                              }}
                            />
                          ) : (
                            <span>
                              🍽️
                            </span>
                          )}
                        </div>

                        {/* FOOD DETAILS */}

                        <div className="menu-food-info">
                          <h3>
                            {item.name}
                          </h3>

                          <p>
                            {item.description ||
                              "Delicious food from our restaurant"}
                          </p>

                          <div className="menu-food-bottom">
                            <strong>
                              ₹
                              {Number(
                                item.price ||
                                  0
                              ).toFixed(0)}
                            </strong>

                            <button
                              onClick={() =>
                                handleAddItem(
                                  item
                                )
                              }
                              disabled={
                                groupPlaced
                              }
                            >
                              <Plus
                                size={17}
                              />
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              SHARED CART
          ================================================== */}

          {activeTab === "cart" && (
            <section className="group-content-section">

              <div className="section-title-row">
                <div>
                  <span className="small-label">
                    SHARED CART
                  </span>

                  <h2>
                    Everyone's food
                  </h2>
                </div>

                <button
                  className="refresh-button"
                  onClick={() =>
                    loadGroup(
                      groupCode
                    )
                  }
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="empty-state">
                  <ShoppingCart
                    size={45}
                  />

                  <h3>
                    Your shared cart
                    is empty
                  </h3>

                  <p>
                    Add food from the
                    menu to get started.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setActiveTab(
                        "menu"
                      )
                    }
                  >
                    Add Food
                  </button>
                </div>
              ) : (
                <div className="cart-layout">

                  <div className="group-cart-list">
                    {cartItems.map(
                      (item) => (
                        <div
                          className="group-cart-item"
                          key={
                            item.group_cart_item_id
                          }
                        >
                          <div className="cart-item-icon">
                            🍛
                          </div>

                          <div className="cart-item-main">
                            <h3>
                              {item.item_name}
                            </h3>

                            <small>
                              Added by{" "}
                              <strong>
                                {
                                  item.user_name
                                }
                              </strong>
                            </small>

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

                          <div className="quantity-control">
                            <button
                              onClick={() =>
                                changeQuantity(
                                  item,
                                  Number(
                                    item.quantity
                                  ) - 1
                                )
                              }
                              disabled={
                                groupPlaced
                              }
                            >
                              <Minus
                                size={15}
                              />
                            </button>

                            <strong>
                              {
                                item.quantity
                              }
                            </strong>

                            <button
                              onClick={() =>
                                changeQuantity(
                                  item,
                                  Number(
                                    item.quantity
                                  ) + 1
                                )
                              }
                              disabled={
                                groupPlaced
                              }
                            >
                              <Plus
                                size={15}
                              />
                            </button>
                          </div>

                          <strong className="item-total">
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
                            ).toFixed(0)}
                          </strong>

                          {Number(
                            item.user_id
                          ) ===
                            Number(
                              user.user_id
                            ) &&
                            !groupPlaced && (
                              <button
                                className="delete-button"
                                onClick={() =>
                                  handleDeleteItem(
                                    item
                                  )
                                }
                              >
                                <Trash2
                                  size={17}
                                />
                              </button>
                            )}
                        </div>
                      )
                    )}
                  </div>

                  <aside className="group-summary">
                    <span>
                      GROUP TOTAL
                    </span>

                    <h2>
                      ₹
                      {cartTotal.toFixed(
                        0
                      )}
                    </h2>

                    <p>
                      {cartItems.length}{" "}
                      items in shared
                      cart
                    </p>

                    {!groupPlaced && (
                      <button
                        className="primary-button full"
                        onClick={
                          handleInitializePayments
                        }
                        disabled={
                          cartItems.length ===
                            0 ||
                          loading
                        }
                      >
                        {loading
                          ? "Preparing..."
                          : "Continue to Split Bill"}
                      </button>
                    )}
                  </aside>
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              SPLIT BILL
          ================================================== */}

          {activeTab === "payment" && (
            <section className="group-content-section">

              <div className="section-title-row">
                <div>
                  <span className="small-label">
                    SPLIT BILL
                  </span>

                  <h2>
                    Everyone pays their share
                  </h2>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="empty-state">
                  <CreditCard
                    size={45}
                  />

                  <h3>
                    Payments not initialized
                  </h3>

                  <p>
                    Continue from the
                    shared cart to
                    initialize split
                    payments.
                  </p>

                  <button
                    className="primary-button"
                    onClick={
                      handleInitializePayments
                    }
                  >
                    Initialize Split Bill
                  </button>
                </div>
              ) : (
                <>
                  <div className="payment-progress">
                    <div>
                      <strong>
                        {paidCount}
                      </strong>

                      <span>
                        Paid
                      </span>
                    </div>

                    <div>
                      <strong>
                        {pendingCount}
                      </strong>

                      <span>
                        Pending
                      </span>
                    </div>

                    <div>
                      <strong>
                        {payments.length}
                      </strong>

                      <span>
                        Members
                      </span>
                    </div>
                  </div>

                  <div className="payment-list">
                    {payments.map(
                      (payment) => {
                        const isCurrentUser =
                          Number(
                            payment.user_id
                          ) ===
                          Number(
                            user.user_id
                          );

                        const paid =
                          payment.payment_status ===
                          "PAID";

                        return (
                          <div
                            className={`payment-card ${
                              paid
                                ? "paid"
                                : ""
                            }`}
                            key={
                              payment.group_payment_id
                            }
                          >
                            <div className="payment-avatar">
                              {paid
                                ? "✓"
                                : "💳"}
                            </div>

                            <div className="payment-user">
                              <strong>
                                {
                                  payment.user_name
                                }

                                {isCurrentUser &&
                                  " (You)"}
                              </strong>

                              <small>
                                {paid
                                  ? "Payment completed"
                                  : "Payment pending"}
                              </small>
                            </div>

                            <strong className="payment-amount">
                              ₹
                              {Number(
                                payment.amount ||
                                  0
                              ).toFixed(0)}
                            </strong>

                            {paid ? (
                              <span className="paid-badge">
                                <CheckCircle2
                                  size={16}
                                />
                                PAID
                              </span>
                            ) : isCurrentUser ? (
                              <button
                                className="pay-button"
                                onClick={() =>
                                  handleDemoPayment(
                                    payment.group_payment_id
                                  )
                                }
                                disabled={
                                  paymentLoading ===
                                  payment.group_payment_id
                                }
                              >
                                {paymentLoading ===
                                payment.group_payment_id
                                  ? "Processing..."
                                  : "Demo Pay"}
                              </button>
                            ) : (
                              <span className="waiting-badge">
                                Waiting
                              </span>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>

                  {groupPlaced && (
                    <div className="order-success">
                      <div>
                        🎉
                      </div>

                      <h2>
                        Group Order Placed!
                      </h2>

                      <p>
                        Everyone has paid
                        their share.
                      </p>

                      <strong>
                        Total Paid: ₹
                        {payments
                          .reduce(
                            (
                              total,
                              payment
                            ) =>
                              total +
                              Number(
                                payment.amount ||
                                  0
                              ),
                            0
                          )
                          .toFixed(0)}
                      </strong>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </>
      )}

      {/* FOOTER */}

      <footer className="group-footer">
        <div>
          🍽️{" "}
          <strong>
            FoodFlow
          </strong>
        </div>

        <span>
          Group Ordering • Live Split Bill
        </span>

        <button
          onClick={goHome}
        >
          Back to FoodFlow
        </button>
      </footer>
    </div>
  );
}

export default GroupOrder;