const cron = require("node-cron");
const { generateDailyOrders } = require("../services/orderService");

const startCronJobs = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const result = await generateDailyOrders(new Date());
      console.log(
        `[CRON] Daily orders generated for ${result.date}. Inserted: ${result.insertedCount}`
      );
    } catch (error) {
      console.error("[CRON] Failed to generate daily orders:", error.message);
    }
  });

  console.log("[CRON] Daily order generation scheduled at 00:00.");
};

module.exports = {
  startCronJobs,
};
