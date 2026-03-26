const bcrypt = require("bcrypt");
const { findByEmail, createUser } = require("../models/userModel");

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

module.exports = { register, login };
