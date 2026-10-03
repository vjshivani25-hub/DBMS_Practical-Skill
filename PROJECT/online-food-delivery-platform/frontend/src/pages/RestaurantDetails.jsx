import { useEffect, useState } from "react";
import { ArrowLeft, Clock3, MapPin, Star } from "lucide-react";
import FoodItem from "../components/FoodItem";
import { getRestaurantMenu } from "../services/api";

// Real food image fallbacks
const FOOD_IMAGES = {
  biryani:
    "https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=600&q=80",

  chicken:
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&q=80",

  pizza:
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",

  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",

  friedRice:
    "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80",

  dessert:
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",

  dosa:
    "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80",

  drinks:
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80",

  default:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
};

// Select a realistic image based on the dish name/category
function getFoodImage(item) {
  // First priority: image stored in database
  if (item.image_url) {
    return item.image_url;
  }

  const name = (item.name || "").toLowerCase();
  const category = (item.category_name || "").toLowerCase();

  if (
    name.includes("biryani") ||
    category.includes("biryani")
  ) {
    return FOOD_IMAGES.biryani;
  }

  if (
    name.includes("chicken") ||
    name.includes("kebab") ||
    name.includes("65")
  ) {
    return FOOD_IMAGES.chicken;
  }

  if (
    name.includes("pizza") ||
    category.includes("pizza")
  ) {
    return FOOD_IMAGES.pizza;
  }

  if (
    name.includes("burger") ||
    category.includes("burger")
  ) {
    return FOOD_IMAGES.burger;
  }

  if (
    name.includes("fried rice") ||
    name.includes("noodles") ||
    name.includes("manchurian") ||
    name.includes("spring roll") ||
    name.includes("soup") ||
    category.includes("chinese")
  ) {
    return FOOD_IMAGES.friedRice;
  }

  if (
    name.includes("cake") ||
    name.includes("brownie") ||
    name.includes("gulab") ||
    name.includes("dessert") ||
    name.includes("meetha") ||
    category.includes("dessert")
  ) {
    return FOOD_IMAGES.dessert;
  }

  if (
    name.includes("dosa") ||
    name.includes("idli") ||
    name.includes("vada")
  ) {
    return FOOD_IMAGES.dosa;
  }

  if (
    name.includes("coffee") ||
    name.includes("cappuccino") ||
    name.includes("milkshake") ||
    name.includes("drink") ||
    category.includes("drink")
  ) {
    return FOOD_IMAGES.drinks;
  }

  return FOOD_IMAGES.default;
}

// Restaurant banner image
function getRestaurantImage(restaurant) {
  const name = (restaurant?.name || "").toLowerCase();

  if (
    name.includes("biryani") ||
    name.includes("bawarchi")
  ) {
    return FOOD_IMAGES.biryani;
  }

  if (name.includes("pizza")) {
    return FOOD_IMAGES.pizza;
  }

  if (name.includes("burger")) {
    return FOOD_IMAGES.burger;
  }

  if (
    name.includes("dragon") ||
    name.includes("wok") ||
    name.includes("spice")
  ) {
    return FOOD_IMAGES.friedRice;
  }

  if (
    name.includes("sweet") ||
    name.includes("truth")
  ) {
    return FOOD_IMAGES.dessert;
  }

  if (name.includes("dosa")) {
    return FOOD_IMAGES.dosa;
  }

  if (
    name.includes("cafe") ||
    name.includes("mocha")
  ) {
    return FOOD_IMAGES.drinks;
  }

  return FOOD_IMAGES.default;
}

function RestaurantDetails({
  restaurant,
  cart,
  setCart,
  goHome,
  goCart,
}) {
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState("");

  // Fetch restaurant-specific menu
  useEffect(() => {
    async function loadMenu() {
      if (!restaurant?.restaurant_id) {
        return;
      }

      try {
        setLoadingMenu(true);
        setMenuError("");

        const data = await getRestaurantMenu(
          restaurant.restaurant_id
        );

        if (data.success) {
          // Convert backend data into the format
          // expected by FoodItem and Cart
          const formattedItems = data.items.map((item) => ({
            id: item.item_id,
            item_id: item.item_id,
            restaurant_id: item.restaurant_id,
            name: item.name,
            price: Number(item.price),
            description:
              item.description ||
              "Delicious freshly prepared food.",
            category_id: item.category_id,
            category_name: item.category_name,
            image_url: item.image_url,
            image: getFoodImage(item),
            veg:
              !item.name.toLowerCase().includes("chicken") &&
              !item.name.toLowerCase().includes("mutton") &&
              !item.name.toLowerCase().includes("kebab"),
          }));

          setMenuItems(formattedItems);
        } else {
          setMenuError("Failed to load restaurant menu");
        }
      } catch (error) {
        console.error("Menu API error:", error);
        setMenuError(
          "Unable to connect to FoodFlow backend"
        );
      } finally {
        setLoadingMenu(false);
      }
    }

    loadMenu();
  }, [restaurant]);

  const addToCart = (item) => {
    setCart((current) => {
      const existing = current.find(
        (cartItem) =>
          cartItem.id === item.id
      );

      if (existing) {
        return current.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity:
                  cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      return [
        ...current,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (item) => {
    setCart((current) => {
      const existing = current.find(
        (cartItem) =>
          cartItem.id === item.id
      );

      if (!existing) {
        return current;
      }

      if (existing.quantity === 1) {
        return current.filter(
          (cartItem) =>
            cartItem.id !== item.id
        );
      }

      return current.map((cartItem) =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              quantity:
                cartItem.quantity - 1,
            }
          : cartItem
      );
    });
  };

  const getQuantity = (id) => {
    const item = cart.find(
      (cartItem) =>
        cartItem.id === id
    );

    return item
      ? item.quantity
      : 0;
  };

  const cartCount = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  if (!restaurant) {
    return (
      <div className="restaurant-page">
        <div className="restaurant-topbar">
          <button onClick={goHome}>
            <ArrowLeft size={19} />
            Back
          </button>
        </div>

        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Restaurant not found</h2>
          <button onClick={goHome}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const restaurantImage =
    getRestaurantImage(restaurant);

  const deliveryFee = Number(
    restaurant.delivery_fee || 0
  );

  const deliveryTime =
    deliveryFee <= 25
      ? "15-20 min"
      : deliveryFee <= 30
      ? "20-25 min"
      : deliveryFee <= 35
      ? "25-30 min"
      : "30-35 min";

  return (
    <div className="restaurant-page">
      {/* TOP BAR */}
      <div className="restaurant-topbar">
        <button onClick={goHome}>
          <ArrowLeft size={19} />
          Back
        </button>

        <button
          onClick={goCart}
          className="mini-cart"
        >
          🛒 Cart ({cartCount})
        </button>
      </div>

      {/* RESTAURANT BANNER */}
      <section className="restaurant-banner">
        <div
          className="restaurant-big-image"
          style={{
            backgroundImage: `url("${restaurantImage}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div>
          <p className="section-label">
            RESTAURANT
          </p>

          <h1>{restaurant.name}</h1>

          <p>
            {restaurant.description ||
              "Delicious food freshly prepared and delivered to your doorstep."}
          </p>

          <div className="restaurant-details">
            <span>
              <Star
                size={16}
                fill="currentColor"
              />
              {Number(
                restaurant.rating || 0
              ).toFixed(1)}
            </span>

            <span>
              <Clock3 size={16} />
              {deliveryTime}
            </span>

            <span>
              <MapPin size={16} />
              {restaurant.city ||
                "Hyderabad"}
            </span>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section className="menu-section">
        <div className="menu-heading">
          <div>
            <p className="section-label">
              MENU
            </p>

            <h2>
              Popular dishes
            </h2>
          </div>

          {cartCount > 0 && (
            <button
              className="view-cart-btn"
              onClick={goCart}
            >
              View Cart ({cartCount})
            </button>
          )}
        </div>

        {/* LOADING */}
        {loadingMenu && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
            }}
          >
            <h3>
              🍽️ Loading menu...
            </h3>

            <p>
              Getting fresh dishes
              from the restaurant.
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loadingMenu && menuError && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
            }}
          >
            <h3>
              ⚠️ {menuError}
            </h3>

            <p>
              Please make sure the
              FoodFlow backend is running.
            </p>
          </div>
        )}

        {/* EMPTY MENU */}
        {!loadingMenu &&
          !menuError &&
          menuItems.length === 0 && (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
              }}
            >
              <h3>
                No menu items available
              </h3>

              <p>
                This restaurant has
                not added menu items yet.
              </p>
            </div>
          )}

        {/* REAL MENU FROM MYSQL */}
        {!loadingMenu &&
          !menuError &&
          menuItems.length > 0 && (
            <div className="food-list">
              {menuItems.map((item) => (
                <FoodItem
                  key={item.id}
                  item={item}
                  quantity={getQuantity(
                    item.id
                  )}
                  onAdd={() =>
                    addToCart(item)
                  }
                  onRemove={() =>
                    removeFromCart(item)
                  }
                />
              ))}
            </div>
          )}
      </section>
    </div>
  );
}

export default RestaurantDetails;