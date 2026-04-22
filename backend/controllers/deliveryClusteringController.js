const {
  generateDeliveryRoutes,
  getPartnerRoute,
} = require("../services/deliveryClustering");

/**
 * POST /api/admin/generate-routes
 * Body: { date: "YYYY-MM-DD", slot: "morning" | "evening" }
 */
const generateRoutes = async (req, res) => {
  try {
    const { date, slot } = req.body;

    if (!date || !slot) {
      return res.status(400).json({
        success: false,
        message: "Both 'date' and 'slot' are required.",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Date must be in YYYY-MM-DD format.",
      });
    }

    if (!["morning", "evening"].includes(slot)) {
      return res.status(400).json({
        success: false,
        message: "Slot must be 'morning' or 'evening'.",
      });
    }

    const result = await generateDeliveryRoutes(date, slot);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.assignments,
    });
  } catch (error) {
    console.error("Generate routes error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

/**
 * GET /api/delivery/my-route?partner_id=X&date=YYYY-MM-DD
 */
const getMyRoute = async (req, res) => {
  try {
    const partnerId = Number(req.query.partner_id);
    const date = String(req.query.date || "").trim();

    if (!partnerId || Number.isNaN(partnerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid 'partner_id' is required.",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Valid 'date' (YYYY-MM-DD) is required.",
      });
    }

    const orders = await getPartnerRoute(partnerId, date);

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get partner route error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = { generateRoutes, getMyRoute };
