/**
 * Validation middleware for user registration
 */
const validateRegistration = (req, res, next) => {
  const { name, email, password, phone, role } = req.body;
  const errors = [];

  // Required fields
  if (!name || !name.trim()) errors.push("Name is required");
  if (!email || !email.trim()) errors.push("Email is required");
  if (!password) errors.push("Password is required");
  if (!phone || !phone.trim()) errors.push("Phone is required");
  if (!role || !role.trim()) errors.push("Role is required");

  // Return early if required fields are missing
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Invalid email format");
  }

  // Password length
  if (password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  // Phone validation (exactly 10 digits)
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone)) {
    errors.push("Phone number must be exactly 10 digits");
  }

  // Role validation
  const validRoles = ["customer", "admin", "delivery_partner"];
  if (!validRoles.includes(role)) {
    errors.push("Role must be one of: customer, admin, delivery_partner");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

/**
 * Validation middleware for user login
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Required fields
  if (!email || !email.trim()) errors.push("Email is required");
  if (!password) errors.push("Password is required");

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Invalid email format");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

module.exports = { validateRegistration, validateLogin };
