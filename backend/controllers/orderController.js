const {
  getOrdersByCustomerId,
  getOrdersByDate,
  generateDailyOrders,
  markOrderDelivered,
  resetOrderToOutForDelivery,
  getLatestOrderBySubscription,
} = require("../services/orderService");

const getUserOrders = async (req, res) => {
  try {
    const resolvedUserId = Number(req.query.user_id);

    if (!resolvedUserId || Number.isNaN(resolvedUserId)) {
      return res.status(400).json({
        success: false,
        message: "Valid user_id is required.",
      });
    }

    const orders = await getOrdersByCustomerId(resolvedUserId);

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const getAdminOrdersByDate = async (req, res) => {
  try {
    const selectedDate = String(req.query.date || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return res.status(400).json({
        success: false,
        message: "Valid date (YYYY-MM-DD) is required.",
      });
    }

    const orders = await getOrdersByDate(selectedDate);

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get admin orders by date error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const generateTodayDemoOrders = async (req, res) => {
  try {
    const result = await generateDailyOrders(new Date());

    return res.status(200).json({
      success: true,
      message: "Today demo orders generated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Manual daily order generation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate today demo orders.",
    });
  }
};

const markDelivered = async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!orderId || Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order ID is required.",
      });
    }

    const updated = await markOrderDelivered(orderId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Order not found or already delivered.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order marked as delivered.",
    });
  } catch (error) {
    console.error("Mark delivered error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const getTrackingInfo = async (req, res) => {
  try {
    const subscriptionId = Number(req.query.subscription_id);

    if (!subscriptionId || Number.isNaN(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription_id is required.",
      });
    }

    const order = await getLatestOrderBySubscription(subscriptionId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this subscription.",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get tracking info error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const resetOrderForDemo = async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!orderId || Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order ID is required.",
      });
    }

    const updated = await resetOrderToOutForDelivery(orderId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not in delivered state.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order reset to out_for_delivery for demo replay.",
    });
  } catch (error) {
    console.error("Reset order for demo error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = {
  getUserOrders,
  getAdminOrdersByDate,
  generateTodayDemoOrders,
  markDelivered,
  resetOrderForDemo,
  getTrackingInfo,
};
