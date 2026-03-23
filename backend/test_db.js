const mysql = require("mysql2");

async function checkConnection() {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Saikumar@2005",
      // Connect without a specific DB since we don't know if subscription_db exists yet
    });

    console.log("SUCCESS: Connection established!");
    connection.destroy();
  } catch (err) {
    console.error("FAILED:", err.message);
  }
}

checkConnection();
