import React, { useState } from "react";
import { Mail, Lock, Store, ArrowLeft, Eye, EyeOff } from "lucide-react";

function RestaurantLogin({ onLogin, goHome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    const DEMO_EMAIL = "restaurant@gmail.com";
    const DEMO_PASSWORD = "123456";

    if (
      email.trim().toLowerCase() === DEMO_EMAIL &&
      password === DEMO_PASSWORD
    ) {
      const restaurantUser = {
        email: DEMO_EMAIL,
        role: "RESTAURANT_OWNER",
        name: "FoodFlow Restaurant Partner",
      };

      localStorage.setItem(
        "foodflow_restaurant_user",
        JSON.stringify(restaurantUser)
      );

      localStorage.setItem("foodflow_restaurant_token", "restaurant-demo-token");

      onLogin(restaurantUser);
    } else {
      setError("Invalid restaurant email or password.");
    }
  };

  return (
    <div className="restaurant-login-page">
      {/* Header */}
      <div className="restaurant-login-header">
        <button className="restaurant-back-btn" onClick={goHome}>
          <ArrowLeft size={18} />
          Back to FoodFlow
        </button>

        <div className="restaurant-brand">
          <div className="restaurant-brand-icon">
            <Store size={22} />
          </div>
          <span>FoodFlow</span>
        </div>

        <div className="restaurant-header-label">
          Restaurant Partner
        </div>
      </div>

      {/* Main */}
      <main className="restaurant-login-main">
        <div className="restaurant-login-card">
          <div className="restaurant-login-icon">
            <Store size={30} />
          </div>

          <div className="restaurant-login-heading">
            <span className="restaurant-small-label">
              RESTAURANT PARTNER
            </span>

            <h1>Welcome back 👋</h1>

            <p>
              Login to manage your restaurant orders,
              update order status and track your business.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="restaurant-login-form">
            {/* Email */}
            <div className="restaurant-field">
              <label>Email Address</label>

              <div className="restaurant-input-wrapper">
                <Mail size={18} />

                <input
                  type="email"
                  placeholder="restaurant@gmail.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="restaurant-field">
              <label>Password</label>

              <div className="restaurant-input-wrapper">
                <Lock size={18} />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="button"
                  className="password-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="restaurant-login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="restaurant-login-submit"
            >
              Login to Restaurant Dashboard
            </button>
          </form>

          {/* Demo credentials */}
          <div className="restaurant-demo-box">
            <div className="restaurant-demo-title">
              Demo Restaurant Login
            </div>

            <div className="restaurant-demo-row">
              <span>Email</span>
              <strong>restaurant@gmail.com</strong>
            </div>

            <div className="restaurant-demo-row">
              <span>Password</span>
              <strong>123456</strong>
            </div>
          </div>

          <button
            className="restaurant-customer-link"
            onClick={goHome}
          >
            ← Back to Customer Website
          </button>
        </div>
      </main>

      <footer className="restaurant-login-footer">
        © 2026 FoodFlow · Restaurant Partner Portal
      </footer>
    </div>
  );
}

export default RestaurantLogin;