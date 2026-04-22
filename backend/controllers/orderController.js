const {
  getOrdersByCustomerId,
  getOrdersByDate,
  generateDailyOrders,
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

module.exports = {
  getUserOrders,
  getAdminOrdersByDate,
  generateTodayDemoOrders,
};
