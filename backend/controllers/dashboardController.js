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

/**
 * Controller for Delivery Partner Dashboard Data
 * GET /api/dashboard/partner
 * Returns delivery assignments, earnings, and status breakdown for today
 */
const getPartnerDashboard = async (req, res) => {
  try {
    // Demo data structure showing what will be fetched in future sprints
    // In Sprint 5+ this will fetch actual assigned routes, orders, and earnings
    const dashboardData = {
      message: "Welcome to your Delivery Dashboard! Here you can track today's deliveries, earnings, and performance.",
      stats: {
        assignedDeliveries: 0,
        completedToday: 0,
        todayEarnings: 0.00,
        deliveryStatus: {
          assigned: 0,
          inTransit: 0,
          delivered: 0,
          failed: 0
        }
      }
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
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
