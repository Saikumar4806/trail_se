const {
  getSubscriptionsByUserId,
  pauseSubscriptionForTodayById,
  unpauseSubscriptionForTodayById,
  deleteSubscriptionByIdForUser,
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
      if (result.code === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cancelled subscriptions cannot be paused.",
        });
      }

      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    if (result.alreadyPausedToday) {
      return res.status(200).json({
        success: true,
        message: "Tomorrow's order is already paused.",
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
      message: "Tomorrow's order paused successfully.",
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

const unpauseSubscriptionForToday = async (req, res) => {
  try {
    const subscriptionId = Number(req.params.id);

    if (!subscriptionId || Number.isNaN(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription id is required.",
      });
    }

    const result = await unpauseSubscriptionForTodayById(subscriptionId);

    if (!result.success) {
      if (result.code === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cancelled subscriptions cannot be unpaused.",
        });
      }

      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    if (result.alreadyUnpausedToday) {
      return res.status(200).json({
        success: true,
        message: "Tomorrow's order is not paused.",
        data: {
          subscription_id: subscriptionId,
          pause_date: result.pauseDate,
          alreadyUnpausedToday: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tomorrow's order unpaused successfully.",
      data: {
        subscription_id: subscriptionId,
        pause_date: result.pauseDate,
        alreadyUnpausedToday: false,
      },
    });
  } catch (error) {
    console.error("Unpause subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const deleteSubscription = async (req, res) => {
  try {
    const subscriptionId = Number(req.params.id);
    const resolvedUserId = Number(req.query.user_id);

    if (!subscriptionId || Number.isNaN(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription id is required.",
      });
    }

    if (!resolvedUserId || Number.isNaN(resolvedUserId)) {
      return res.status(400).json({
        success: false,
        message: "Valid user_id is required.",
      });
    }

    const result = await deleteSubscriptionByIdForUser(subscriptionId, resolvedUserId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription deleted successfully.",
    });
  } catch (error) {
    console.error("Delete subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = {
  getUserSubscriptions,
  pauseSubscriptionForToday,
  unpauseSubscriptionForToday,
  deleteSubscription,
};
