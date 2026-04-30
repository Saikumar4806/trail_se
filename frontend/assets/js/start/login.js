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
  const passwordToggleBtns = document.querySelectorAll(".password-toggle-btn");

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
      "customer": "../../pages/customer/dashboard.html",
      "admin": "../../pages/admin/dashboard.html",
      "delivery_partner": "../../pages/delivery/dashboard.html",
    };
    return routes[role] || "../../pages/start/login.html";
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
        // Store user info in sessionStorage for use across pages.
        const user = { ...data.user, role: data.user.role.toLowerCase().replace(/ /g, "_") };
        sessionStorage.setItem("user", JSON.stringify(user));

        showStatus("Login successful! Redirecting…", "success");

        // Redirect based on user role
        setTimeout(() => {
          window.location.href = getRedirectPath(user.role);
        }, 1000);
      } else if (response.status === 403) {
        if (window.Swal && typeof window.Swal.fire === "function") {
          await window.Swal.fire({
            icon: "error",
            title: "Blocked Account",
            text: "You account is bloacked please contact admin.",
            confirmButtonText: "OK",
          });
        } else {
          alert("You account is bloacked please contact admin.");
        }
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

  passwordToggleBtns.forEach((toggleBtn) => {
    toggleBtn.addEventListener("click", () => {
      const targetId = toggleBtn.getAttribute("data-target");
      const targetInput = document.getElementById(targetId);
      if (!targetInput) return;

      const isPassword = targetInput.type === "password";
      targetInput.type = isPassword ? "text" : "password";
    });
  });
});

