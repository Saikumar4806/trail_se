const { spawn } = require("child_process");
const path = require("path");
const db = require("../config/db");

/**
 * Generate clustered delivery routes for a given date and slot.
 * 1. Fetch available delivery partners
 * 2. Fetch pending orders with coordinates
 * 3. Run Python K-Means clustering + Nearest Neighbor routing
 * 4. Assign clusters to partners and persist partner_id in orders table
 */
async function generateDeliveryRoutes(deliveryDate, deliverySlot) {
  // 1. Fetch available delivery partners
  const [partners] = await db.query(
    `SELECT id, name, email FROM users WHERE role = 'delivery_partner'`
  );

  if (partners.length === 0) {
    throw new Error("No delivery partners available.");
  }

  // 2. Fetch orders joined with addresses for coordinates
  const [orders] = await db.query(
    `SELECT
        o.order_id,
        o.customer_id,
        u.name AS customer_name,
        a.latitude,
        a.longitude,
        a.street,
        a.area,
        o.delivery_slot,
        o.total_amount,
        o.status
     FROM orders o
     JOIN addresses a ON o.address_id = a.address_id
     JOIN users u ON o.customer_id = u.id
     WHERE o.delivery_date = ?
       AND o.delivery_slot = ?
       AND o.status = 'out_for_delivery'`,
    [deliveryDate, deliverySlot]
  );

  if (orders.length === 0) {
    return { message: "No pending orders found for this date and slot.", assignments: [] };
  }

  // 3. Prepare payload for Python
  const payload = {
    orders: orders.map((o) => ({
      order_id: o.order_id,
      customer_id: o.customer_id,
      customer_name: o.customer_name,
      latitude: parseFloat(o.latitude),
      longitude: parseFloat(o.longitude),
      address: `${o.street}, ${o.area}`,
      delivery_slot: o.delivery_slot,
      total_amount: parseFloat(o.total_amount),
      status: o.status,
    })),
    k: partners.length,
  };

  // 4. Call Python clustering script
  const clusteredRoutes = await runPythonClustering(payload);

  // 5. Map clusters to partners and update DB
  const finalAssignments = [];

  for (let index = 0; index < clusteredRoutes.length; index++) {
    const cluster = clusteredRoutes[index];
    const partner = partners[index];

    // Update partner_id for each order in this cluster
    const orderIds = cluster.route.map((r) => r.order_id);
    if (orderIds.length > 0) {
      await db.query(
        `UPDATE orders SET partner_id = ? WHERE order_id IN (?)`,
        [partner.id, orderIds]
      );
    }

    finalAssignments.push({
      partner_id: partner.id,
      partner_name: partner.name,
      partner_email: partner.email,
      cluster_id: cluster.cluster_id,
      total_orders: cluster.total_orders,
      route: cluster.route,
    });
  }

  return { message: "Routes generated successfully.", assignments: finalAssignments };
}

/**
 * Get the assigned route for a specific delivery partner on a given date.
 */
async function getPartnerRoute(partnerId, deliveryDate) {
  const [orders] = await db.query(
    `SELECT
        o.order_id,
        o.customer_id,
        u.name AS customer_name,
        a.latitude,
        a.longitude,
        a.street,
        a.area,
        o.delivery_slot,
        o.total_amount,
        o.status
     FROM orders o
     JOIN addresses a ON o.address_id = a.address_id
     JOIN users u ON o.customer_id = u.id
     WHERE o.partner_id = ?
       AND o.delivery_date = ?
     ORDER BY o.order_id ASC`,
    [partnerId, deliveryDate]
  );

  return orders;
}

/**
 * Spawn the Python route_clustering.py child process.
 * Uses the full path to Python executable to avoid PATH issues.
 */
function runPythonClustering(payload) {
  const scriptPath = path.join(__dirname, "route_clustering.py");
  
  // Get python paths to try in order
  const pythonPaths = [
    // Windows Python 3.12+ installation
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python312", "python.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python311", "python.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python310", "python.exe"),
    // Standard PATH commands
    "python3",
    "python"
  ];

  const tryPython = (pythonCmds, index = 0) => {
    if (index >= pythonCmds.length) {
      return Promise.reject(
        new Error("Python not found. Please ensure Python 3.10+ is installed with scikit-learn.")
      );
    }

    const pythonCmd = pythonCmds[index];
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonCmd, [scriptPath]);
      let dataString = "";
      let errorString = "";

      pythonProcess.stdout.on("data", (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorString += data.toString();
      });

      pythonProcess.on("error", (error) => {
        // Try next Python path
        console.log(`Python command failed (${pythonCmd}), trying next...`);
        return tryPython(pythonCmds, index + 1)
          .then(resolve)
          .catch(reject);
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          // Try next Python path if this one failed
          if (errorString.includes("ModuleNotFoundError") || errorString.includes("No module named")) {
            console.log(`Sklearn not found in ${pythonCmd}, trying next...`);
            return tryPython(pythonCmds, index + 1)
              .then(resolve)
              .catch(reject);
          }
          return reject(
            new Error(`Python process exited with code ${code}: ${errorString}`)
          );
        }
        try {
          resolve(JSON.parse(dataString));
        } catch (err) {
          reject(new Error("Failed to parse Python output: " + dataString));
        }
      });

      pythonProcess.stdin.write(JSON.stringify(payload));
      pythonProcess.stdin.end();
    });
  };

  return tryPython(pythonPaths);
}

module.exports = { generateDeliveryRoutes, getPartnerRoute };
