// Profile Management
const PROFILE_API_BASE = "http://localhost:5000/api/auth/profile";

document.addEventListener("DOMContentLoaded", () => {
  const profileForm = document.getElementById("profileForm");
  const profileMessage = document.getElementById("profileMessage");

  if (!profileForm) return;

  let user = null;

  try {
    user = JSON.parse(sessionStorage.getItem("user"));
  } catch (error) {
    console.error("Error reading user context:", error);
  }

  const normalizedRole = user && user.role
    ? String(user.role).toLowerCase().replace(/\s+/g, "_")
    : null;

  if (!user || !user.id || normalizedRole !== "customer") {
    alert("Unauthorized access. Please login as a Customer.");
    window.location.href = "../start/login.html";
    return;
  }

  // Load user profile data
  const loadUserProfile = () => {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem("user"));
      if (currentUser) {
        user = currentUser;
        document.getElementById("profileName").value = currentUser.name || "";
        document.getElementById("profileEmail").value = currentUser.email || "";
        document.getElementById("profilePhone").value = currentUser.phone || "";
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  // Validate form inputs
  const validateProfileForm = () => {
    const errors = {};
    const name = document.getElementById("profileName").value.trim();
    const email = document.getElementById("profileEmail").value.trim();
    const phone = document.getElementById("profilePhone").value.trim();
    const currentPassword = document.getElementById("currentPassword").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmNewPassword").value.trim();

    // Validate name
    if (!name) {
      errors.name = "Name is required";
    } else if (name.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    // Validate email
    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email";
    }

    // Validate phone
    if (!phone) {
      errors.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(phone.replace(/\D/g, ""))) {
      errors.phone = "Please enter a valid 10-digit phone number";
    }

    // Validate password if any password field is filled
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword) {
        errors.currentPassword = "Current password is required to change password";
      }
      if (!newPassword) {
        errors.newPassword = "New password is required";
      } else if (newPassword.length < 6) {
        errors.newPassword = "New password must be at least 6 characters";
      }
      if (newPassword !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    // Display errors
    Object.keys(errors).forEach((key) => {
      const errorEl = document.getElementById(`${key}Error`);
      if (errorEl) {
        errorEl.textContent = errors[key];
        errorEl.classList.add("show");
      }
    });

    return Object.keys(errors).length === 0;
  };

  // Clear errors
  const clearErrors = () => {
    document.querySelectorAll(".error-msg").forEach((el) => {
      el.textContent = "";
      el.classList.remove("show");
    });
  };

  // Submit profile form
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    if (!validateProfileForm()) return;

    const userId = user.id;

    const formData = {
      name: document.getElementById("profileName").value.trim(),
      email: document.getElementById("profileEmail").value.trim(),
      phone: document.getElementById("profilePhone").value.trim(),
    };

    const newPassword = document.getElementById("newPassword").value.trim();
    if (newPassword) {
      formData.currentPassword = document.getElementById("currentPassword").value.trim();
      formData.newPassword = newPassword;
    }

    try {
      profileMessage.innerHTML = "";
      profileMessage.classList.remove("show", "success", "error");

      const response = await fetch(`${PROFILE_API_BASE}/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(userId),
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update profile");
      }

      // Keep only profile fields returned by server in local storage.
      const updatedUser = {
        ...user,
        ...(result.data || {}),
      };
      delete updatedUser.currentPassword;
      delete updatedUser.newPassword;

      user = updatedUser;
      sessionStorage.setItem("user", JSON.stringify(updatedUser));

      profileMessage.textContent = result.message || "Profile updated successfully!";
      profileMessage.classList.add("show", "success");

      // Clear password fields
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmNewPassword").value = "";

      setTimeout(() => {
        profileMessage.classList.remove("show");
      }, 4000);
    } catch (error) {
      console.error("Profile update error:", error);
      profileMessage.textContent = error.message || "Failed to update profile";
      profileMessage.classList.add("show", "error");
    }
  });

  // Reset form
  profileForm.addEventListener("reset", () => {
    clearErrors();
    loadUserProfile();
  });

  // Load profile on page load
  loadUserProfile();
});

