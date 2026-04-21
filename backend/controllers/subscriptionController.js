const {
  getSubscriptionsByUserId,
  pauseSubscriptionForTodayById,
} = require("../models/subscriptionModel");

const getUserSubscriptions = async (req, res) => {
  try {
    const resolvedUserId =
      req.user?.id ||
      req.user?.user_id ||
      Number(req.query.user_id) ||
      Number(req.params.user_id) ||
      1;

    if (!resolvedUserId || Number.isNaN(Number(resolvedUserId))) {
      return res.status(400).json({
        success: false,
        message: "Valid user_id is required.",
      });
    }

    const subscriptions = await getSubscriptionsByUserId(Number(resolvedUserId));

    return res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const pauseSubscriptionForToday = async (req, res) => {
  try {
    const subscriptionId = Number(req.params.id);
    const reason = req.body?.reason ? String(req.body.reason).trim() : null;

    if (!subscriptionId || Number.isNaN(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription id is required.",
      });
    }

    const result = await pauseSubscriptionForTodayById(subscriptionId, reason);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    if (result.alreadyPausedToday) {
      return res.status(200).json({
        success: true,
        message: "Subscription already paused for today.",
        data: {
          subscription_id: subscriptionId,
          pause_date: result.pauseDate,
          resume_date: result.resumeDate,
          alreadyPausedToday: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription paused for today.",
      data: {
        subscription_id: subscriptionId,
        pause_date: result.pauseDate,
        resume_date: result.resumeDate,
        alreadyPausedToday: false,
      },
    });
  } catch (error) {
    console.error("Pause subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = {
  getUserSubscriptions,
  pauseSubscriptionForToday,
};
