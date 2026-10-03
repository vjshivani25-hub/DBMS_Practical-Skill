import React, { useState } from "react";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { loginUser } from "../services/api";

export default function DeliveryLogin({ onLogin, goHome }) {
  const [email, setEmail] = useState("delivery@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const result = await loginUser({
        email,
        password,
      });

      if (!result.success) {
        throw new Error(result.message || "Invalid login credentials.");
      }

      if (result.user?.role !== "DELIVERY_PARTNER") {
        throw new Error("This account is not a delivery partner account.");
      }

      localStorage.setItem(
        "foodflow_delivery_user",
        JSON.stringify(result.user)
      );

      if (result.token) {
        localStorage.setItem("foodflow_delivery_token", result.token);
      }

      onLogin(result.user);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delivery-login-page">
      <header className="delivery-topbar">
        <button className="delivery-back-btn" onClick={goHome}>
          <ArrowLeft size={18} />
          Back to FoodFlow
        </button>

        <div className="delivery-brand">
          <div className="delivery-brand-icon">
            <Bike size={23} />
          </div>
          <span>FoodFlow Delivery</span>
        </div>
      </header>

      <main className="delivery-login-content">
        <section className="delivery-hero">
          <div className="delivery-badge">
            <Bike size={15} />
            DELIVERY PARTNER
          </div>

          <h1>
            Deliver
            <br />
            <span>happiness.</span>
          </h1>

          <p className="delivery-hero-description">
            Manage your FoodFlow deliveries, pick up orders and deliver them
            safely to customers.
          </p>

          <div className="delivery-features">
            <div className="delivery-feature">
              <div className="delivery-feature-icon">
                <CheckCircle2 size={20} />
              </div>
              <span>View ready orders</span>
            </div>

            <div className="delivery-feature">
              <div className="delivery-feature-icon">
                <CheckCircle2 size={20} />
              </div>
              <span>Track active deliveries</span>
            </div>

            <div className="delivery-feature">
              <div className="delivery-feature-icon">
                <CheckCircle2 size={20} />
              </div>
              <span>Update delivery status</span>
            </div>
          </div>
        </section>

        <section className="delivery-login-card">
          <div className="delivery-card-icon">
            <Bike size={28} />
          </div>

          <h2>Welcome back</h2>
          <p>Sign in to manage your deliveries.</p>

          {error && <div className="delivery-error">{error}</div>}

          <form className="delivery-form" onSubmit={handleSubmit}>
            <div className="delivery-form-group">
              <label>Email Address</label>

              <div className="delivery-input-wrapper">
                <Mail className="delivery-input-icon" size={18} />

                <input
                  className="delivery-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="delivery-form-group">
              <label>Password</label>

              <div className="delivery-input-wrapper delivery-password-wrapper">
                <LockKeyhole className="delivery-input-icon" size={18} />

                <input
                  className="delivery-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="delivery-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <button
              className="delivery-login-btn"
              type="submit"
              disabled={loading}
            >
              <Bike size={18} />
              {loading ? "Signing in..." : "Login to Delivery Dashboard"}
            </button>
          </form>

          <div className="delivery-demo-box">
            <strong>Demo Delivery Account</strong>
            <br />
            Email: delivery@gmail.com
            <br />
            Use the password configured for this account.
          </div>
        </section>
      </main>
    </div>
  );
}