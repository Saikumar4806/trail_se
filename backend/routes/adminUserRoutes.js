const express = require("express");
const router = express.Router();

const { findById } = require("../models/userModel");
const {
  getCustomers,
  getDeliveryPartners,
  updateManagedUserStatus,
} = require("../controllers/adminUserController");

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

const normalizeStatus = (status) =>
  String(status || "")
    .toLowerCase()
    .trim();

const requireAdmin = async (req, res, next) => {
  try {
    const userIdHeader = req.header("x-user-id");
    const userId = Number.parseInt(userIdHeader, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid admin context",
      });
    }

    const user = await findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Admin user not found",
      });
    }

    if (normalizeRole(user.role) !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can access this endpoint",
      });
    }

    if (normalizeStatus(user.status || "active") === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Blocked admin cannot access this endpoint",
      });
    }

    req.adminUser = user;
    return next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error validating admin access",
    });
  }
};

router.use(requireAdmin);

router.get("/users/customers", getCustomers);
router.get("/users/delivery-partners", getDeliveryPartners);
router.patch("/users/:id/status", updateManagedUserStatus);

module.exports = router;
