/**
 * Login Page — Client-Side Logic
 * Validates form, sends credentials to backend, and redirects based on role.
 */

const API_URL = "http://localhost:5000/api/auth/login";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const submitBtn = document.getElementById("submitBtn");
  const statusMessage = document.getElementById("statusMessage");

  // Input references
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  // Error span references
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");

  // --- Helpers ---

  function clearErrors() {
    emailError.textContent = "";
    passwordError.textContent = "";
    statusMessage.textContent = "";
    statusMessage.className = "status-msg";
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-msg " + type;
  }

  // --- Validation ---

  function validate() {
    let valid = true;

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim()) {
      emailError.textContent = "Email is required";
      valid = false;
    } else if (!emailRegex.test(emailInput.value.trim())) {
      emailError.textContent = "Enter a valid email address";
      valid = false;
    }

    // Password
    if (!passwordInput.value) {
      passwordError.textContent = "Password is required";
      valid = false;
    }

    return valid;
  }

  // --- Role-based redirect mapping ---

  function getRedirectPath(role) {
    const routes = {
      customer: "/frontend/pages/customer/dashboard.html",
      admin: "/frontend/pages/admin/dashboard.html",
      delivery_partner: "/frontend/pages/delivery/dashboard.html",
    };
    return routes[role] || "/frontend/pages/start/login.html";
  }

  // --- Form submission ---

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    const payload = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store user info in localStorage for use across pages
        localStorage.setItem("user", JSON.stringify(data.user));

        showStatus("Login successful! Redirecting…", "success");

        // Redirect based on user role
        setTimeout(() => {
          window.location.href = getRedirectPath(data.user.role);
        }, 1000);
      } else {
        showStatus(data.message || "Login failed. Please try again.", "error");
      }
    } catch (err) {
      console.error("Login error:", err);
      showStatus("Could not connect to the server. Please ensure the backend is running.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  });

  // --- Clear per-field error on user input ---
  emailInput.addEventListener("input", () => { emailError.textContent = ""; });
  passwordInput.addEventListener("input", () => { passwordError.textContent = ""; });
});
