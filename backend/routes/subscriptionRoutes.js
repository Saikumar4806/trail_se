const express = require("express");
const router = express.Router();
const {
	getUserSubscriptions,
	pauseSubscriptionForToday,
} = require("../controllers/subscriptionController");

router.get("/user", getUserSubscriptions);
router.post("/:id/pause", pauseSubscriptionForToday);

module.exports = router;
