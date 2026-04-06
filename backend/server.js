const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const itemRoutes = require("./routes/itemRoutes");

const app = express();
const port = process.env.PORT || 5000;

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------- Routes ---------------
app.get("/", (req, res) => {
  res.send("Subscription Delivery System API");
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/items", itemRoutes);

// --------------- Start Server ---------------
app.listen(port, () => {
  console.log("Server started on port " + port);
});