const express = require("express");
const router = express.Router();
const {
	getUserSubscriptions,
	pauseSubscriptionForToday,
	unpauseSubscriptionForToday,
	deleteSubscription,
	getSubscriptionPauses,
} = require("../controllers/subscriptionController");

router.get("/user", getUserSubscriptions);
router.get("/:id/pauses", getSubscriptionPauses);
router.post("/:id/pause", pauseSubscriptionForToday);
router.post("/:id/unpause", unpauseSubscriptionForToday);
router.delete("/:id", deleteSubscription);

module.exports = router;
