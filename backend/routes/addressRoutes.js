const express = require("express");
const router = express.Router();
const { addAddress, getUserAddresses } = require("../controllers/addressController");

// POST /api/addresses — Create a new address
router.post("/", addAddress);

// GET /api/addresses/:userId — Get all addresses for a user
router.get("/:userId", getUserAddresses);

module.exports = router;
