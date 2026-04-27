const express = require("express");
const {
  requireAdmin,
  getMonthSalaryOverview,
  approveAllSalaries,
  markAllSalariesPaid,
  updateSingleSalary,
} = require("../controllers/salaryController");

const router = express.Router();

router.use(requireAdmin);

router.get("/salaries/overview", getMonthSalaryOverview);
router.post("/salaries/approve-all", approveAllSalaries);
router.post("/salaries/pay-all", markAllSalariesPaid);
router.patch("/salaries/:partnerId", updateSingleSalary);

module.exports = router;
