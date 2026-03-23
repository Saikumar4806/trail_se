const express = require("express");
const router = express.Router();
const {
  getCustomerDashboard,
  getAdminDashboard,
  getPartnerDashboard,
} = require("../controllers/dashboardController");

// GET /api/dashboard/customer
router.get("/customer", getCustomerDashboard);

// GET /api/dashboard/admin
router.get("/admin", getAdminDashboard);

// GET /api/dashboard/partner
router.get("/partner", getPartnerDashboard);

module.exports = router;
