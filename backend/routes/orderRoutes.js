const express = require("express");
const {
  getUserOrders,
  getAdminOrdersByDate,
  generateTodayDemoOrders,
  markDelivered,
  resetOrderForDemo,
  getTrackingInfo,
  getPartnerOrders,
} = require("../controllers/orderController");

const router = express.Router();

router.get("/orders/user", getUserOrders);
router.get("/orders/partner", getPartnerOrders);
router.get("/orders/track", getTrackingInfo);
router.patch("/orders/:id/deliver", markDelivered);
router.patch("/orders/:id/reset-for-demo", resetOrderForDemo);
router.get("/admin/orders/by-date", getAdminOrdersByDate);
router.post("/admin/orders/generate-today-demo-orders", generateTodayDemoOrders);

module.exports = router;
