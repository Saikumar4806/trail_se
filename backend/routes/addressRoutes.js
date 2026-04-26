const express = require("express");
const router = express.Router();
const {
	addAddress,
	getUserAddresses,
	updateAddress,
	deleteAddress,
} = require("../controllers/addressController");

// POST /api/addresses — Create a new address
router.post("/", addAddress);

// GET /api/addresses/:userId — Get all addresses for a user
router.get("/:userId", getUserAddresses);

// PUT /api/addresses/:addressId — Update address
router.put("/:addressId", updateAddress);

// DELETE /api/addresses/:addressId — Delete address
router.delete("/:addressId", deleteAddress);

module.exports = router;
