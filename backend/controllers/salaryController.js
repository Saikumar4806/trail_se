const db = require("../config/db");
const { findById } = require("../models/userModel");

const BASE_RATE_PER_DELIVERY = 40;

const ensureSalaryTable = async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS partner_salary_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      partner_id INT NOT NULL,
      salary_month CHAR(7) NOT NULL,
      total_deliveries INT NOT NULL DEFAULT 0,
      base_rate DECIMAL(10,2) NOT NULL DEFAULT 40.00,
      base_salary DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      bonus DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      deductions DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      net_salary DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status ENUM('pending', 'approved', 'paid') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_partner_month (partner_id, salary_month),
      FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
};

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

const normalizeStatus = (status) =>
  String(status || "")
    .toLowerCase()
    .trim();

const ensureValidMonth = (value) => {
  const month = String(value || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }
  return month;
};

const calculateBonus = (deliveries) => {
  const count = Number(deliveries || 0);
  if (count >= 100) return 2500;
  if (count >= 60) return 1200;
  if (count >= 30) return 500;
  return 0;
};

const requireAdmin = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.header("x-user-id"), 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid admin context",
      });
    }

    const user = await findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Admin user not found",
      });
    }

    if (normalizeRole(user.role) !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can access this endpoint",
      });
    }

    if (normalizeStatus(user.status || "active") === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Blocked admin cannot access this endpoint",
      });
    }

    req.adminUser = user;
    return next();
  } catch (error) {
    console.error("Salary admin auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error validating admin access",
    });
  }
};

const getMonthSalaryOverview = async (req, res) => {
  try {
    await ensureSalaryTable();

    const month = ensureValidMonth(req.query.month);
    const selectedPartnerId = Number.parseInt(req.query.partner_id, 10);

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Valid month (YYYY-MM) is required.",
      });
    }

    const partnerFilterSql =
      Number.isInteger(selectedPartnerId) && selectedPartnerId > 0
        ? "AND u.id = ?"
        : "";
    const partnerFilterParams =
      Number.isInteger(selectedPartnerId) && selectedPartnerId > 0
        ? [selectedPartnerId]
        : [];

    const [partners] = await db.query(
      `SELECT
        u.id AS partner_id,
        u.name AS partner_name,
        u.status AS partner_account_status,
        COUNT(o.order_id) AS total_deliveries
      FROM users u
      LEFT JOIN orders o
        ON o.partner_id = u.id
        AND DATE_FORMAT(o.delivery_date, '%Y-%m') = ?
        AND o.status = 'delivered'
      WHERE LOWER(REPLACE(u.role, ' ', '_')) = 'delivery_partner'
      ${partnerFilterSql}
      GROUP BY u.id, u.name, u.status
      ORDER BY u.name ASC`,
      [month, ...partnerFilterParams]
    );

    const [salaryRecords] = await db.query(
      `SELECT
        partner_id,
        base_rate,
        bonus,
        deductions,
        status
      FROM partner_salary_records
      WHERE salary_month = ?`,
      [month]
    );

    const recordsByPartner = new Map(
      salaryRecords.map((row) => [Number(row.partner_id), row])
    );

    const salaryRows = [];
    for (const partner of partners) {
      const deliveries = Number(partner.total_deliveries || 0);
      const record = recordsByPartner.get(Number(partner.partner_id));

      const baseRate = Number(record?.base_rate ?? BASE_RATE_PER_DELIVERY);
      const baseSalary = deliveries * baseRate;
      const bonus = Number(record?.bonus ?? calculateBonus(deliveries));
      const deductions = Math.max(0, Number(record?.deductions ?? 0));
      const netSalary = Math.max(0, baseSalary + bonus - deductions);
      const status = record?.status || "pending";

      await db.query(
        `INSERT INTO partner_salary_records
          (partner_id, salary_month, total_deliveries, base_rate, base_salary, bonus, deductions, net_salary, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           total_deliveries = VALUES(total_deliveries),
           base_rate = VALUES(base_rate),
           base_salary = VALUES(base_salary),
           net_salary = VALUES(net_salary),
           updated_at = CURRENT_TIMESTAMP`,
        [
          partner.partner_id,
          month,
          deliveries,
          baseRate,
          baseSalary,
          bonus,
          deductions,
          netSalary,
          status,
        ]
      );

      salaryRows.push({
        partner_id: Number(partner.partner_id),
        partner_name: partner.partner_name,
        partner_account_status: normalizeStatus(partner.partner_account_status || "active"),
        total_deliveries: deliveries,
        base_rate: baseRate,
        base_salary: baseSalary,
        bonus,
        deductions,
        net_salary: netSalary,
        status,
      });
    }

    const totalPartners = salaryRows.length;
    const totalDeliveries = salaryRows.reduce((sum, row) => sum + row.total_deliveries, 0);
    const totalSalary = salaryRows.reduce((sum, row) => sum + row.net_salary, 0);
    const averageSalary = totalPartners ? totalSalary / totalPartners : 0;

    const [revenueRows] = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS subscription_revenue
       FROM orders
       WHERE DATE_FORMAT(delivery_date, '%Y-%m') = ?
         AND status = 'delivered'`,
      [month]
    );

    const subscriptionRevenue = Number(revenueRows[0]?.subscription_revenue || 0);
    const salaryExpense = totalSalary;
    const grossProfit = subscriptionRevenue - salaryExpense;
    const profitMargin = subscriptionRevenue > 0 ? (grossProfit / subscriptionRevenue) * 100 : 0;
    const avgRevenuePerDelivery =
      totalDeliveries > 0 ? subscriptionRevenue / totalDeliveries : 0;
    const costPerDelivery = totalDeliveries > 0 ? salaryExpense / totalDeliveries : 0;
    const payoutRatio = subscriptionRevenue > 0 ? (salaryExpense / subscriptionRevenue) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        month,
        summary: {
          totalPartners,
          totalDeliveries,
          totalSalary,
          averageSalary,
        },
        finance: {
          subscriptionRevenue,
          salaryExpense,
          grossProfit,
          profitMargin,
          avgRevenuePerDelivery,
          costPerDelivery,
          payoutRatio,
        },
        salaries: salaryRows,
      },
    });
  } catch (error) {
    console.error("Salary overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const approveAllSalaries = async (req, res) => {
  try {
    await ensureSalaryTable();

    const month = ensureValidMonth(req.body?.month);
    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Valid month (YYYY-MM) is required.",
      });
    }

    await db.query(
      `UPDATE partner_salary_records
       SET status = 'approved'
       WHERE salary_month = ?
         AND status = 'pending'`,
      [month]
    );

    return res.status(200).json({
      success: true,
      message: `All pending salaries approved for ${month}.`,
    });
  } catch (error) {
    console.error("Approve salaries error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const markAllSalariesPaid = async (req, res) => {
  try {
    await ensureSalaryTable();

    const month = ensureValidMonth(req.body?.month);
    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Valid month (YYYY-MM) is required.",
      });
    }

    await db.query(
      `UPDATE partner_salary_records
       SET status = 'paid'
       WHERE salary_month = ?
         AND status IN ('pending', 'approved')`,
      [month]
    );

    return res.status(200).json({
      success: true,
      message: `All salaries marked as paid for ${month}.`,
    });
  } catch (error) {
    console.error("Mark salaries paid error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const updateSingleSalary = async (req, res) => {
  try {
    await ensureSalaryTable();

    const partnerId = Number.parseInt(req.params.partnerId, 10);
    const month = ensureValidMonth(req.body?.month);
    const bonus = Number(req.body?.bonus);
    const deductions = Number(req.body?.deductions);

    if (!Number.isInteger(partnerId) || partnerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid partner id is required.",
      });
    }

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Valid month (YYYY-MM) is required.",
      });
    }

    if (Number.isNaN(bonus) || Number.isNaN(deductions) || bonus < 0 || deductions < 0) {
      return res.status(400).json({
        success: false,
        message: "Bonus and deductions must be valid non-negative numbers.",
      });
    }

    const [rows] = await db.query(
      `SELECT total_deliveries, base_rate
       FROM partner_salary_records
       WHERE partner_id = ? AND salary_month = ?
       LIMIT 1`,
      [partnerId, month]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Salary record not found. Run salary calculation first.",
      });
    }

    const totalDeliveries = Number(rows[0].total_deliveries || 0);
    const baseRate = Number(rows[0].base_rate || BASE_RATE_PER_DELIVERY);
    const baseSalary = totalDeliveries * baseRate;
    const netSalary = Math.max(0, baseSalary + bonus - deductions);

    await db.query(
      `UPDATE partner_salary_records
       SET bonus = ?, deductions = ?, base_salary = ?, net_salary = ?, status = 'pending'
       WHERE partner_id = ? AND salary_month = ?`,
      [bonus, deductions, baseSalary, netSalary, partnerId, month]
    );

    return res.status(200).json({
      success: true,
      message: "Salary updated successfully.",
    });
  } catch (error) {
    console.error("Update single salary error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = {
  requireAdmin,
  getMonthSalaryOverview,
  approveAllSalaries,
  markAllSalariesPaid,
  updateSingleSalary,
};
