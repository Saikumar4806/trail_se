const express = require("express");
const router = express.Router();
const {
	getUserSubscriptions,
	pauseSubscriptionForToday,
	unpauseSubscriptionForToday,
} = require("../controllers/subscriptionController");

router.get("/user", getUserSubscriptions);
router.post("/:id/pause", pauseSubscriptionForToday);
router.post("/:id/unpause", unpauseSubscriptionForToday);

module.exports = router;
