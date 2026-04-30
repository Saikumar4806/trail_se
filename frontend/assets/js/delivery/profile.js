// Delivery Partner Profile Management
const PROFILE_API_BASE = "http://localhost:5000/api/auth/profile";

document.addEventListener("DOMContentLoaded", () => {
  const profileForm = document.getElementById("profileForm");
  const statusMessage = document.getElementById("statusMessage");
  const logoutBtn = document.getElementById("logoutBtn");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profilePhone = document.getElementById("profilePhone");
  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput = document.getElementById("newPassword");
  const passwordToggleBtns = document.querySelectorAll(".password-toggle-btn");

  const user = JSON.parse(sessionStorage.getItem("user"));

  const normalizedRole = user && user.role
    ? String(user.role).toLowerCase().replace(/\s+/g, "_")
    : null;

  if (!user || !user.id || normalizedRole !== "delivery_partner") {
    alert("Unauthorized access. Please login as a Delivery Partner.");
    window.location.href = "../start/login.html";
    return;
  }

  // Load profile data
  document.getElementById("profileName").value = user.name || "";
  document.getElementById("profileEmail").value = user.email || "";
  document.getElementById("profilePhone").value = user.phone || "";

  // Handle Logout
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("user");
    window.location.href = "../start/login.html";
  });

  // Cancel button - reset form to original values
  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "./dashboard.html";
    });
  }

  // Handle Form Submission
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearErrors();
    statusMessage.textContent = "";
    statusMessage.className = "status-message";
    statusMessage.style.display = "none";

    const name = profileName.value.trim();
    const email = profileEmail.value.trim();
    const phone = profilePhone.value.trim();
    const currentPassword = currentPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();

    if (!validateProfileForm({ name, email, phone, currentPassword, newPassword })) {
      return;
    }

    const hasProfileChanges = (
      name !== String(user.name || "")
      || email !== String(user.email || "")
      || phone !== String(user.phone || "")
    );
    const hasPasswordChange = Boolean(newPassword || currentPassword);

    if (!hasProfileChanges && !hasPasswordChange) {
      showStatus("No changes were made.", "error");
      return;
    }

    const payload = { name, email, phone };
    if (newPassword) {
      if (!currentPassword) {
        showStatus("Current password is required to change password", "error");
        return;
      }
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      const response = await fetch(`${PROFILE_API_BASE}/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id)
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showStatus("Profile updated successfully!", "success");
        // Update local storage
        const updatedUser = { ...user, ...result.data };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Clear password fields
        currentPasswordInput.value = "";
        newPasswordInput.value = "";
      } else {
        showStatus(result.message || "Failed to update profile", "error");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      showStatus("Network error. Please try again.", "error");
    }
  });

  function showStatus(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = "block";
    setTimeout(() => {
      statusMessage.style.display = "none";
    }, 5000);
  }

  function clearErrors() {
    document.querySelectorAll(".error-msg").forEach((el) => {
      el.textContent = "";
      el.classList.remove("show");
    });
  }

  function setError(field, message) {
    const errorEl = document.getElementById(`${field}Error`);
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.add("show");
  }

  function validateProfileForm({ name, email, phone, currentPassword, newPassword }) {
    let valid = true;

    if (!name) {
      setError("name", "Name is required");
      valid = false;
    } else if (name.length < 2) {
      setError("name", "Name must be at least 2 characters");
      valid = false;
    }

    if (!email) {
      setError("email", "Email is required");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("email", "Please enter a valid email");
      valid = false;
    }

    if (!phone) {
      setError("phone", "Phone number is required");
      valid = false;
    } else if (!/^\d{10}$/.test(phone)) {
      setError("phone", "Phone number must be exactly 10 digits");
      valid = false;
    }

    if (newPassword || currentPassword) {
      if (!currentPassword) {
        setError("currentPassword", "Current password is required");
        valid = false;
      }
      if (!newPassword) {
        setError("newPassword", "New password is required");
        valid = false;
      } else if (newPassword.length < 6) {
        setError("newPassword", "New password must be at least 6 characters");
        valid = false;
      } else if (newPassword === currentPassword) {
        setError("newPassword", "Try a new password");
        valid = false;
      }
    }

    return valid;
  }

  [profileName, profileEmail, profilePhone, currentPasswordInput, newPasswordInput].forEach((inputEl) => {
    inputEl?.addEventListener("input", clearErrors);
  });

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
