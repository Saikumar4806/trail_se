const {
  createAddress,
  getAddressesByUserId,
} = require("../models/addressModel");

/**
 * Handle creating a new address
 * POST /api/addresses
 */
const addAddress = async (req, res) => {
  try {
    const {
      user_id,
      street,
      area,
      city,
      state,
      pincode,
      landmark,
      latitude,
      longitude,
      address_type,
      is_default,
    } = req.body;

    // ---- Validate required fields ----
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!street || !street.trim()) {
      return res.status(400).json({
        success: false,
        message: "Street address is required.",
      });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: "City is required.",
      });
    }

    if (!state || !state.trim()) {
      return res.status(400).json({
        success: false,
        message: "State is required.",
      });
    }

    if (!pincode || !pincode.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Pincode is required.",
      });
    }

    if (!address_type) {
      return res.status(400).json({
        success: false,
        message: "Address type is required.",
      });
    }

    const validTypes = ["home", "work", "other"];
    if (!validTypes.includes(address_type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Address type must be home, work, or other.",
      });
    }

    // ---- Insert into database ----
    const result = await createAddress({
      user_id: Number(user_id),
      street: street.trim(),
      area: area ? area.trim() : null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.toString().trim(),
      landmark: landmark ? landmark.trim() : null,
      latitude: latitude || null,
      longitude: longitude || null,
      address_type: address_type.toLowerCase(),
      is_default: !!is_default,
    });

    return res.status(201).json({
      success: true,
      message: "Address saved successfully.",
      address_id: result.insertId,
    });
  } catch (error) {
    console.error("Add address error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Get all addresses for the authenticated user
 * GET /api/addresses/:userId
 */
const getUserAddresses = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const addresses = await getAddressesByUserId(Number(userId));

    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.error("Get addresses error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

module.exports = { addAddress, getUserAddresses };
