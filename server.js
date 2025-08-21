const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://jade-stardust-498215.netlify.app"
  ]
}));
app.use(express.json());

// Mount your adminFormCode router
const adminFormRoute = require("./EpicLuxeBackend/adminFormCode");
const herosSectionAdmin = require("./EpicLuxeBackend/heroSectionAdmin");
const adminBlogRoute = require("./EpicLuxeBackend/adminBlog");
const heroReassuredBanner = require("./EpicLuxeBackend/reassured/heroBanner")
const inventoryReassured = require("./EpicLuxeBackend/reassured/inventory");
const reassured_leads = require("./EpicLuxeBackend/reassured/leads");

const leadsRoute = require("./EpicLuxeBackend/Leads")
app.use("/admin", leadsRoute);
app.use("/admin", adminFormRoute); //uses by admin only get will be used in frontend
app.use("/admin", herosSectionAdmin);
app.use("/admin", adminBlogRoute);
app.use("/admin", heroReassuredBanner);
app.use("/admin", inventoryReassured);
app.use("/admin", reassured_leads);

// Simple health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is up and running!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
