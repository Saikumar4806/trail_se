const {
  findById,
  getUsersByRole,
  updateUserStatus,
} = require("../models/userModel");

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

const normalizeStatus = (status) =>
  String(status || "")
    .toLowerCase()
    .trim();

/**
 * GET /api/admin/users/customers
 */
const getCustomers = async (req, res) => {
  try {
    const customers = await getUsersByRole("customer");
    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching customers",
    });
  }
};

/**
 * GET /api/admin/users/delivery-partners
 */
const getDeliveryPartners = async (req, res) => {
  try {
    const partners = await getUsersByRole("delivery_partner");
    return res.status(200).json({
      success: true,
      data: partners,
    });
  } catch (error) {
    console.error("Error fetching delivery partners:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching delivery partners",
    });
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Body: { status: "active" | "blocked" }
 */
const updateManagedUserStatus = async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const nextStatus = normalizeStatus(req.body?.status);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    if (!["active", "blocked"].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or blocked",
      });
    }

    const targetUser = await findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (targetUser.id === req.adminUser.id) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot change own status",
      });
    }

    const targetRole = normalizeRole(targetUser.role);
    if (!["customer", "delivery_partner"].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: "Only customers and delivery partners can be managed",
      });
    }

    const currentStatus = normalizeStatus(targetUser.status || "active");

    if (currentStatus !== nextStatus) {
      await updateUserStatus(userId, nextStatus);
    }

    const updatedUser = await findById(userId);

    return res.status(200).json({
      success: true,
      message:
        nextStatus === "blocked"
          ? "User blocked successfully"
          : "User unblocked successfully",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: normalizeRole(updatedUser.role),
        status: normalizeStatus(updatedUser.status || "active"),
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating user status",
    });
  }
};

module.exports = {
  getCustomers,
  getDeliveryPartners,
  updateManagedUserStatus,
};
