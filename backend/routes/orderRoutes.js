const express = require("express");
const {
  getUserOrders,
  getAdminOrdersByDate,
  generateTodayDemoOrders,
} = require("../controllers/orderController");

const router = express.Router();

router.get("/orders/user", getUserOrders);
router.get("/admin/orders/by-date", getAdminOrdersByDate);
router.post("/admin/orders/generate-today-demo-orders", generateTodayDemoOrders);

module.exports = router;
