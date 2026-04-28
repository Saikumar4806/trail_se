const {
  getTotalUsersCount,
  getDeliveryPartnersCount,
} = require("../models/userModel");

/**
 * Controller for Customer Dashboard Data
 * GET /api/dashboard/customer
 */
const getCustomerDashboard = async (req, res) => {
  try {
    // In Sprint 2 this will fetch actual subscriptions and orders
    return res.status(200).json({
      success: true,
      data: {
        message: "Welcome to the Customer Dashboard!",
        stats: { activeSubscriptions: 0, pendingDeliveries: 0 },
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Controller for Admin Dashboard Data
 * GET /api/dashboard/admin
 */
const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await getTotalUsersCount();
    const activePartners = await getDeliveryPartnersCount();

    // Order module is not implemented yet, so keep this as 0 for now.
    const todaysOrders = 0;

    return res.status(200).json({
      success: true,
      data: {
        message: "Welcome to the Admin Dashboard!",
        stats: { totalUsers, activePartners, todaysOrders },
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const db = require("../config/db");

/**
 * Controller for Delivery Partner Dashboard Data
 * GET /api/dashboard/partner
 */
const getPartnerDashboard = async (req, res) => {
  try {
    const partnerId = Number(req.query.partner_id);

    if (!partnerId || Number.isNaN(partnerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid partner_id is required.",
      });
    }

    // 1. Fetch Today's Orders for this partner
    const [orders] = await db.query(
      `SELECT 
        o.order_id AS id, 
        u.name AS customerName, 
        CONCAT(a.street, ', ', a.area) AS address, 
        o.delivery_slot AS slot, 
        o.status 
      FROM orders o
      JOIN users u ON o.customer_id = u.id
      JOIN addresses a ON o.address_id = a.address_id
      WHERE o.partner_id = ? AND o.order_date = CURDATE()`,
      [partnerId]
    );

    // 2. Calculate Stats
    const totalAssigned = orders.length;
    const completedToday = orders.filter(o => o.status === 'delivered').length;
    const todayEarnings = completedToday * 50.00;

    // 3. Fetch Total Lifetime Earnings
    const [lifetimeRows] = await db.query(
      `SELECT COUNT(*) AS totalCompleted FROM orders WHERE partner_id = ? AND status = 'delivered'`,
      [partnerId]
    );
    const totalEarnings = (lifetimeRows[0].totalCompleted || 0) * 50.00;

    // 4. Status Breakdown for Today
    const statusBreakdown = {
      assigned: totalAssigned - completedToday,
      delivered: completedToday,
      inTransit: orders.filter(o => o.status === 'in_transit' || o.status === 'out_for_delivery').length,
      failed: 0 // Placeholder until failed status is implemented
    };

    return res.status(200).json({
      success: true,
      data: {
        message: "Actual delivery data retrieved successfully.",
        orders: orders,
        stats: {
          assignedDeliveries: totalAssigned,
          completedToday: completedToday,
          todayEarnings: todayEarnings,
          totalEarnings: totalEarnings,
          deliveryStatus: statusBreakdown
        }
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getCustomerDashboard,
  getAdminDashboard,
  getPartnerDashboard,
};
