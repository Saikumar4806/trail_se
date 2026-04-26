const {
  createAddress,
  getAddressesByUserId,
  getAddressById,
  updateAddressById,
  deleteAddressById,
  isAddressLinkedToSubscription,
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
    const userId = req.params.userId || req.query.user_id;

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

/**
 * Update an address
 * PUT /api/addresses/:addressId
 */
const updateAddress = async (req, res) => {
  try {
    const addressId = Number.parseInt(req.params.addressId, 10);
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

    const parsedUserId = Number.parseInt(user_id, 10);

    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid address ID is required.",
      });
    }

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required.",
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

    if (!pincode || !String(pincode).trim()) {
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
    if (!validTypes.includes(String(address_type).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Address type must be home, work, or other.",
      });
    }

    const parsedLat = Number.parseFloat(latitude);
    const parsedLng = Number.parseFloat(longitude);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required.",
      });
    }

    const existingAddress = await getAddressById(addressId);
    if (!existingAddress || Number(existingAddress.user_id) !== parsedUserId) {
      return res.status(404).json({
        success: false,
        message: "Address not found.",
      });
    }

    await updateAddressById(addressId, parsedUserId, {
      street: street.trim(),
      area: area ? String(area).trim() : null,
      city: city.trim(),
      state: state.trim(),
      pincode: String(pincode).trim(),
      landmark: landmark ? String(landmark).trim() : null,
      latitude: parsedLat,
      longitude: parsedLng,
      address_type: String(address_type).toLowerCase(),
      is_default: Boolean(is_default),
    });

    return res.status(200).json({
      success: true,
      message: "Address updated successfully.",
    });
  } catch (error) {
    console.error("Update address error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Delete an address
 * DELETE /api/addresses/:addressId
 */
const deleteAddress = async (req, res) => {
  try {
    const addressId = Number.parseInt(req.params.addressId, 10);
    const userId = Number.parseInt(req.query.user_id, 10);

    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid address ID is required.",
      });
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required.",
      });
    }

    const existingAddress = await getAddressById(addressId);
    if (!existingAddress || Number(existingAddress.user_id) !== userId) {
      return res.status(404).json({
        success: false,
        message: "Address not found.",
      });
    }

    const linkedWithSubscription = await isAddressLinkedToSubscription(addressId);
    if (linkedWithSubscription) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete this address because it is linked to one or more subscriptions.",
      });
    }

    await deleteAddressById(addressId, userId);

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully.",
    });
  } catch (error) {
    console.error("Delete address error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

module.exports = { addAddress, getUserAddresses, updateAddress, deleteAddress };
