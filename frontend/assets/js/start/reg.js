/**
 * Registration Page — Client-Side Logic
 * Handles form validation and sends data to the backend via fetch API.
 */

const API_URL = "http://localhost:5000/api/auth/register";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const submitBtn = document.getElementById("submitBtn");
  const statusMessage = document.getElementById("statusMessage");

  // Input references
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const phoneInput = document.getElementById("phone");
  const roleInput = document.getElementById("role");

  // Error span references
  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const phoneError = document.getElementById("phoneError");
  const roleError = document.getElementById("roleError");

  // --- Helpers ---

  /** Clear all per-field errors and the status banner. */
  function clearErrors() {
    nameError.textContent = "";
    emailError.textContent = "";
    passwordError.textContent = "";
    confirmPasswordError.textContent = "";
    phoneError.textContent = "";
    roleError.textContent = "";
    statusMessage.textContent = "";
    statusMessage.className = "status-msg";
  }

  /** Show a success or error banner. */
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-msg " + type; // "success" or "error"
  }

  // --- Validation ---

  /** Validate all fields. Returns true if everything is valid. */
  function validate() {
    let valid = true;

    // Name
    if (!nameInput.value.trim()) {
      nameError.textContent = "Name is required";
      valid = false;
    }

    // Email format
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
    } else if (passwordInput.value.length < 6) {
      passwordError.textContent = "Must be at least 6 characters";
      valid = false;
    }

    // Confirm password
    if (!confirmPasswordInput.value) {
      confirmPasswordError.textContent = "Please confirm your password";
      valid = false;
    } else if (passwordInput.value !== confirmPasswordInput.value) {
      confirmPasswordError.textContent = "Passwords do not match";
      valid = false;
    }

    // Phone (exactly 10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneInput.value.trim()) {
      phoneError.textContent = "Phone is required";
      valid = false;
    } else if (!phoneRegex.test(phoneInput.value.trim())) {
      phoneError.textContent = "Enter exactly 10 digits";
      valid = false;
    }

    // Role
    if (!roleInput.value) {
      roleError.textContent = "Please select a role";
      valid = false;
    }

    return valid;
  }

  // --- Form submission ---

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    if (!validate()) return;

    // Disable button while request is in-flight
    submitBtn.disabled = true;
    submitBtn.textContent = "Registering…";

    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      password: passwordInput.value,
      phone: phoneInput.value.trim(),
      role: roleInput.value,
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus("Registration successful! Redirecting to login…", "success");
        form.reset();
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      } else if (data.errors) {
        // Backend validation errors
        showStatus(data.errors.join(". "), "error");
      } else {
        showStatus(data.message || "Registration failed. Please try again.", "error");
      }
    } catch (err) {
      console.error("Registration error:", err);
      showStatus("Could not connect to the server. Please ensure the backend is running.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Register";
    }
  });

  // --- Clear per-field error on user input ---
  nameInput.addEventListener("input", () => { nameError.textContent = ""; });
  emailInput.addEventListener("input", () => { emailError.textContent = ""; });
  passwordInput.addEventListener("input", () => { passwordError.textContent = ""; });
  confirmPasswordInput.addEventListener("input", () => { confirmPasswordError.textContent = ""; });
  phoneInput.addEventListener("input", () => { phoneError.textContent = ""; });
  roleInput.addEventListener("change", () => { roleError.textContent = ""; });
});

