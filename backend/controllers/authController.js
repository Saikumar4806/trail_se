const bcrypt = require("bcrypt");
const {
  findByEmail,
  findById,
  createUser,
  updateUserProfile,
} = require("../models/userModel");

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

/**
 * Handle user registration
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if email already exists
    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Hash password with 10 salt rounds
    const hashedPassword = await bcrypt.hash(password, 10);

    // Always store role as lowercase
    const result = await createUser({
      name,
      email,
      password: hashedPassword, // hashed password
      phone,
      role: role.toLowerCase(),
    });

    const userId = result.insertId;

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: { id: userId, name, email, phone, role: role.toLowerCase() },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Handle user login
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare hashed password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const normalizedStatus = String(user.status || "active").toLowerCase();
    if (normalizedStatus === "blocked") {
      return res.status(403).json({
        success: false,
        message: "You account is bloacked please contact admin.",
      });
    }

    // Return user data (excluding password)
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: String(user.role).toLowerCase().replace(/\s+/g, "_"),
        status: normalizedStatus,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Update customer profile
 * PUT /api/auth/profile/:id
 */
const updateProfile = async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const actorId = Number.parseInt(req.header("x-user-id"), 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    if (!Number.isInteger(actorId) || actorId <= 0 || actorId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized profile update attempt",
      });
    }

    const rawName = req.body?.name;
    const rawEmail = req.body?.email;
    const rawPhone = req.body?.phone;
    const rawCurrentPassword = req.body?.currentPassword;
    const rawNewPassword = req.body?.newPassword;

    const name = String(rawName || "").trim();
    const email = String(rawEmail || "").trim();
    const phone = String(rawPhone || "").trim();
    const currentPassword = String(rawCurrentPassword || "").trim();
    const newPassword = String(rawNewPassword || "").trim();

    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ""))) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits",
      });
    }

    const user = await findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Allow customers and delivery partners to update their own profiles
    const roleNormalized = normalizeRole(user.role);
    if (!["customer", "delivery_partner"].includes(roleNormalized)) {
      return res.status(403).json({
        success: false,
        message: "Only customers and delivery partners can update this profile",
      });
    }

    const existingUserWithEmail = await findByEmail(email);
    if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    let nextPasswordHash = null;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to change password",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters",
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      nextPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    await updateUserProfile({
      id: userId,
      name,
      email,
      phone,
      password: nextPasswordHash,
    });

    const updatedUser = await findById(userId);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: normalizeRole(updatedUser.role),
        status: String(updatedUser.status || "active").toLowerCase(),
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

module.exports = { register, login, updateProfile };
