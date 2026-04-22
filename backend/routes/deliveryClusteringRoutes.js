const express = require("express");
const {
  generateRoutes,
  getMyRoute,
} = require("../controllers/deliveryClusteringController");

const router = express.Router();

// Admin: Generate clustered routes for a date + slot
router.post("/admin/generate-routes", generateRoutes);

// Delivery Partner: Get assigned route for a date
router.get("/delivery/my-route", getMyRoute);

module.exports = router;
