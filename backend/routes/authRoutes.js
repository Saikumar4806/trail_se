const express = require("express");
const router = express.Router();
const { register, login, updateProfile } = require("../controllers/authController");
const { validateRegistration, validateLogin } = require("../validations/requestValidation");

// POST /api/auth/register
router.post("/register", validateRegistration, register);

// POST /api/auth/login
router.post("/login", validateLogin, login);

// PUT /api/auth/profile/:id
router.put("/profile/:id", updateProfile);

module.exports = router;
