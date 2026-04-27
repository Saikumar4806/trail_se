const express = require("express");
const {
  generateRoutes,
  getMyRoute,
  setPartnerLocation,
} = require("../controllers/deliveryClusteringController");

const router = express.Router();

// Admin: Generate clustered routes for a date + slot
router.post("/admin/generate-routes", generateRoutes);

// Delivery Partner: Get assigned route for a date
router.get("/delivery/my-route", getMyRoute);

// Delivery Partner: Save current GPS location
router.patch("/delivery/set-location", setPartnerLocation);

module.exports = router;
