import { useState } from "react";
import { ArrowLeft, LockKeyhole, Mail, Phone, User } from "lucide-react";
import { loginUser, registerUser } from "../services/api";

function Auth({ onLogin, goHome }) {
  const [isLogin, setIsLogin] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (isLogin) {
        const data = await loginUser({
          email: form.email,
          password: form.password,
        });

        if (!data.success) {
          setError(data.message || "Login failed");
          return;
        }

        localStorage.setItem("foodflow_token", data.token);
        localStorage.setItem(
          "foodflow_user",
          JSON.stringify(data.user)
        );

        setMessage("Login successful! 🎉");

        if (onLogin) {
          onLogin(data.user);
        }
      } else {
        const data = await registerUser({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: "CUSTOMER",
        });

        if (!data.success) {
          setError(
            data.message || "Registration failed"
          );
          return;
        }

        setMessage(
          "Registration successful! Please login."
        );

        setIsLogin(true);

        setForm({
          name: "",
          email: form.email,
          phone: "",
          password: "",
        });
      }
    } catch (err) {
      console.error("Authentication error:", err);

      setError(
        "Unable to connect to FoodFlow backend."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fffaf5",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          padding: "22px 8%",
          borderBottom: "1px solid #eee5dc",
          background: "rgba(255,250,245,0.96)",
        }}
      >
        <button
          onClick={goHome}
          style={{
            border: 0,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            color: "#555",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={19} />
          Back to FoodFlow
        </button>
      </div>

      {/* AUTH AREA */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "50px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "450px",
            background: "white",
            border: "1px solid #eee5dc",
            borderRadius: "22px",
            padding: "38px",
            boxShadow:
              "0 20px 60px rgba(50,30,10,0.08)",
          }}
        >
          {/* LOGO */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                fontSize: "42px",
                marginBottom: "8px",
              }}
            >
              🍽️
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                letterSpacing: "-1px",
              }}
            >
              Welcome to{" "}
              <span style={{ color: "#f4511e" }}>
                FoodFlow
              </span>
            </h1>

            <p
              style={{
                color: "#777",
                marginTop: "9px",
                marginBottom: 0,
              }}
            >
              {isLogin
                ? "Login to continue ordering delicious food."
                : "Create your FoodFlow account."}
            </p>
          </div>

          {/* LOGIN / REGISTER SWITCH */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "#fff0e9",
              padding: "5px",
              borderRadius: "10px",
              marginBottom: "25px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setMessage("");
                setError("");
              }}
              style={{
                border: 0,
                borderRadius: "7px",
                padding: "11px",
                cursor: "pointer",
                fontWeight: 700,
                background: isLogin
                  ? "#f4511e"
                  : "transparent",
                color: isLogin
                  ? "white"
                  : "#e64a19",
              }}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setMessage("");
                setError("");
              }}
              style={{
                border: 0,
                borderRadius: "7px",
                padding: "11px",
                cursor: "pointer",
                fontWeight: 700,
                background: !isLogin
                  ? "#f4511e"
                  : "transparent",
                color: !isLogin
                  ? "white"
                  : "#e64a19",
              }}
            >
              Register
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit}>
            {/* NAME */}
            {!isLogin && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 700,
                    marginBottom: "7px",
                  }}
                >
                  Full Name
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    border: "1px solid #e2d9d2",
                    borderRadius: "10px",
                    padding: "0 13px",
                  }}
                >
                  <User
                    size={18}
                    color="#999"
                  />

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    required
                    style={{
                      width: "100%",
                      height: "45px",
                      border: 0,
                      outline: 0,
                    }}
                  />
                </div>
              </div>
            )}

            {/* EMAIL */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 700,
                  marginBottom: "7px",
                }}
              >
                Email
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: "1px solid #e2d9d2",
                  borderRadius: "10px",
                  padding: "0 13px",
                }}
              >
                <Mail
                  size={18}
                  color="#999"
                />

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  style={{
                    width: "100%",
                    height: "45px",
                    border: 0,
                    outline: 0,
                  }}
                />
              </div>
            </div>

            {/* PHONE */}
            {!isLogin && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 700,
                    marginBottom: "7px",
                  }}
                >
                  Phone Number
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    border: "1px solid #e2d9d2",
                    borderRadius: "10px",
                    padding: "0 13px",
                  }}
                >
                  <Phone
                    size={18}
                    color="#999"
                  />

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    required
                    style={{
                      width: "100%",
                      height: "45px",
                      border: 0,
                      outline: 0,
                    }}
                  />
                </div>
              </div>
            )}

            {/* PASSWORD */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 700,
                  marginBottom: "7px",
                }}
              >
                Password
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: "1px solid #e2d9d2",
                  borderRadius: "10px",
                  padding: "0 13px",
                }}
              >
                <LockKeyhole
                  size={18}
                  color="#999"
                />

                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: "100%",
                    height: "45px",
                    border: 0,
                    outline: 0,
                  }}
                />
              </div>
            </div>

            {/* SUCCESS */}
            {message && (
              <div
                style={{
                  background: "#eaf8ef",
                  color: "#198754",
                  borderRadius: "9px",
                  padding: "11px 13px",
                  marginBottom: "15px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {message}
              </div>
            )}

            {/* ERROR */}
            {error && (
              <div
                style={{
                  background: "#fff0ef",
                  color: "#d93025",
                  borderRadius: "9px",
                  padding: "11px 13px",
                  marginBottom: "15px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "48px",
                border: 0,
                borderRadius: "10px",
                background: loading
                  ? "#999"
                  : "#f4511e",
                color: "white",
                fontWeight: 700,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                transition: "0.2s",
              }}
            >
              {loading
                ? "Please wait..."
                : isLogin
                ? "Login to FoodFlow"
                : "Create FoodFlow Account"}
            </button>
          </form>

          {/* BOTTOM TEXT */}
          <p
            style={{
              textAlign: "center",
              color: "#888",
              fontSize: "12px",
              marginTop: "22px",
              marginBottom: 0,
            }}
          >
            {isLogin
              ? "New to FoodFlow? Click Register above."
              : "Already have an account? Click Login above."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;