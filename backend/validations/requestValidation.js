const isEmpty = (value) => value === undefined || value === null || String(value).trim() === "";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;
const pincodeRegex = /^\d{6}$/;

const sendValidationError = (res, errors) =>
  res.status(400).json({
    success: false,
    errors,
  });

const validateRegistration = (req, res, next) => {
  const { name, email, password, phone, role } = req.body;
  const errors = [];

  if (isEmpty(name)) errors.push("Name is required");
  if (isEmpty(email)) errors.push("Email is required");
  if (isEmpty(password)) errors.push("Password is required");
  if (isEmpty(phone)) errors.push("Phone is required");
  if (isEmpty(role)) errors.push("Role is required");

  if (!isEmpty(email) && !emailRegex.test(String(email).trim())) {
    errors.push("Invalid email format");
  }

  if (!isEmpty(password) && String(password).length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  if (!isEmpty(phone) && !phoneRegex.test(String(phone).trim())) {
    errors.push("Phone number must be exactly 10 digits");
  }

  const validRoles = ["customer", "admin", "delivery_partner"];
  if (!isEmpty(role) && !validRoles.includes(String(role).trim().toLowerCase())) {
    errors.push("Role must be one of: customer, admin, delivery_partner");
  }

  if (errors.length > 0) return sendValidationError(res, errors);
  return next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (isEmpty(email)) errors.push("Email is required");
  if (isEmpty(password)) errors.push("Password is required");

  if (!isEmpty(email) && !emailRegex.test(String(email).trim())) {
    errors.push("Invalid email format");
  }

  if (errors.length > 0) return sendValidationError(res, errors);
  return next();
};

const validateAddress = (req, res, next) => {
  const { user_id, street, city, state, pincode, address_type } = req.body;
  const errors = [];

  const parsedUserId = Number.parseInt(user_id, 10);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    errors.push("Valid user ID is required");
  }

  if (isEmpty(street)) errors.push("Street address is required");
  if (isEmpty(city)) errors.push("City is required");
  if (isEmpty(state)) errors.push("State is required");
  if (isEmpty(pincode)) errors.push("Pincode is required");
  if (isEmpty(address_type)) errors.push("Address type is required");

  if (!isEmpty(pincode) && !pincodeRegex.test(String(pincode).trim())) {
    errors.push("Pincode must be exactly 6 digits");
  }

  const validTypes = ["home", "work", "other"];
  if (!isEmpty(address_type) && !validTypes.includes(String(address_type).trim().toLowerCase())) {
    errors.push("Address type must be home, work, or other");
  }

  if (errors.length > 0) return sendValidationError(res, errors);
  return next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateAddress,
};
