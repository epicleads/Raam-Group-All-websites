const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Updated CORS configuration with epiccars.in domain added
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5000", // Added for local backend testing
    "https://jade-stardust-498215.netlify.app",
    "https://raam-group-all-websites.onrender.com",
    "https://www.epiccars.in", // Production domain with www
    "https://epiccars.in", // Production domain without www
    "http://www.epiccars.in", // HTTP version with www (if needed)
    "http://epiccars.in", // HTTP version without www (if needed)
    "https://epictoyota.netlify.app",
    "https://raamather.com",
    "http://localhost:3001",
    "https://www.raamhonda.com", // Raam Honda with www
    "https://raamhonda.com", // Raam Honda without www
    "http://www.raamhonda.com", // HTTP version with www
    "http://raamhonda.com", // HTTP version without www
    "https://www.raammg.com", // Raam MG with www
    "https://raammg.com", // Raam MG without www
    "http://www.raammg.com", // HTTP version with www
    "http://raammg.com", // HTTP version without www
    "https://raamgroupadmin.netlify.app",
  ]
}));
app.use(express.json());

// Enhanced debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`\n🌐 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log(`📍 Origin: ${req.headers.origin || 'No origin'}`);
  console.log(`🔧 User-Agent: ${req.headers['user-agent'] || 'No user-agent'}`);
  
  if (req.method === 'POST') {
    console.log('📦 POST Body:', JSON.stringify(req.body, null, 2));
    console.log('📦 Content-Type:', req.headers['content-type']);
  }
  
  next();
});

// Mount your routes
const adminFormRoute = require("./EpicLuxeBackend/adminFormCode");
const stocksAdmin = require("./EpicLuxeBackend/stocksAdmin");
const herosSectionAdmin = require("./EpicLuxeBackend/heroSectionAdmin");
const adminBlogRoute = require("./EpicLuxeBackend/adminBlog");
const heroReassuredBanner = require("./EpicLuxeBackend/reassured/heroBanner");
const inventoryReassured = require("./EpicLuxeBackend/reassured/inventory");
const reassured_leads = require("./EpicLuxeBackend/reassured/leads");
const leadsRoute = require("./EpicLuxeBackend/Leads");
const adsRoute = require("./raam-ather/ads");
const landingPageBanner = require("./EpicToyota/LandingPageBanner");
const { syncMetaLeads } = require("./MGDigitalLeads/services/metaLeadsService");
const {
  syncKnowlarityCalls,
} = require("./MGDigitalLeads/services/knowlaritySyncService");
const mgRouter = require("./raam-mg/router");
const mgLeadsRoute = require("./raam-mg/mg_leads");
const sellNowRoutes = require("./EpicLuxeBackend/servicesRoutes/sellNowRoutes");
const brandData = require("./EpicLuxeBackend/reassured/brandData");
const heroBanner = require("./raam-honda/heroBanner");
const hondaLeadsRoute = require("./raam-honda/honda_leads");
const careersRoute = require("./group/careers");
const ourTeamRoute = require("./group/ourTeam");
const mgDigitalLeadsRoute = require("./MGDigitalLeads/routes/leads");


// Add specific middleware for leads route to debug
app.use("/admin/leads", (req, res, next) => {
  console.log(`\n🎯 LEADS ROUTE HIT: ${req.method} /admin/leads`);
  if (req.method === 'POST') {
    console.log('💾 Attempting to save lead with data:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use("/admin", leadsRoute);
app.use("/admin", adminFormRoute);
app.use("/admin/stocks", stocksAdmin);
app.use("/admin", sellNowRoutes);
app.use("/admin", herosSectionAdmin);
app.use("/admin", adminBlogRoute);
app.use("/admin", heroReassuredBanner);
app.use("/admin", inventoryReassured);
app.use("/admin", reassured_leads);
app.use("/admin/ads", adsRoute);
app.use("/admin/epic-toyota", landingPageBanner);
app.use("/admin/raam-mg", mgRouter);
app.use("/admin/raam-mg/leads", mgLeadsRoute);
app.use("/admin", brandData);
app.use("/admin/raam-honda", heroBanner);
app.use("/admin/raam-honda/leads", hondaLeadsRoute);
app.use("/admin/careers", careersRoute);
app.use("/admin/our-team", ourTeamRoute);
app.use("/admin/mg-digital-leads", mgDigitalLeadsRoute);
// Simple health check endpoint
app.get("/health", (req, res) => {
  console.log("💚 Health check requested");
  res.json({ status: "ok", message: "Server is up and running!" });
});

// Test endpoint for leads
app.post("/admin/test-leads", (req, res) => {
  console.log("🧪 Test leads endpoint hit");
  console.log("Test data received:", req.body);
  res.json({ success: true, message: "Test endpoint working", receivedData: req.body });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err.message);
  console.error('❌ Stack:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test leads: http://localhost:${PORT}/admin/test-leads`);
  console.log("📋 Available routes:");
  console.log("   - POST /admin/leads");
  console.log("   - GET /admin/leads");
  console.log("   - POST /admin/test-leads");
});

/**
 * Automated Meta lead sync
 * --------------------------------------------
 * The CRM is read-only, so we schedule background fetches
 * to keep `mg-digital-leads` populated without manual curl calls.
 *
 * Configure interval with META_SYNC_INTERVAL_MS (default 15 minutes).
 * Set META_SYNC_ENABLED=false to disable if needed (e.g. for local dev).
 */
const shouldRunMetaSync = process.env.META_SYNC_ENABLED !== "false";
const metaSyncIntervalMs =
  Number(process.env.META_SYNC_INTERVAL_MS) || 15 * 60 * 1000;

async function runMetaSync(trigger = "schedule") {
  try {
    console.log(`\n🗓️  [Meta Sync] Triggered via ${trigger}`);
    const summary = await syncMetaLeads();
    console.log(
      `✅ [Meta Sync] Completed: ${summary.formsProcessed} forms, ` +
        `${summary.leadsInserted} inserted, ${summary.leadsSkipped} skipped`
    );
  } catch (error) {
    console.error("❌ [Meta Sync] Failed:", error.message);
  }
}

if (shouldRunMetaSync) {
  setTimeout(() => runMetaSync("startup"), 5_000);
  setInterval(() => runMetaSync("interval"), metaSyncIntervalMs);
  console.log(
    `🗓️  Meta lead sync enabled (every ${metaSyncIntervalMs / 60000} minutes)`
  );
} else {
  console.log(
    "🛑 Meta lead sync disabled (set META_SYNC_ENABLED=false to override)"
  );
}

/**
 * Automated Knowlarity call sync
 * --------------------------------------------
 * Polls Knowlarity's call log API and mirrors the results into
 * `mg-digital-leads`, deduplicating on UUID so repeated logs
 * don't flood the dashboard.
 */
const knowlaritySyncEnabled =
  process.env.KNOWLARITY_SYNC_ENABLED !== "false";
const knowlaritySyncIntervalMs =
  Number(process.env.KNOWLARITY_SYNC_INTERVAL_MS) || 60 * 1000;

async function runKnowlaritySync(trigger = "schedule") {
  try {
    console.log(`\n🗓️  [Knowlarity Sync] Triggered via ${trigger}`);
    const summary = await syncKnowlarityCalls();
    console.log(
      `✅ [Knowlarity Sync] ${summary.inserted} inserted, ${summary.skipped} skipped, ` +
        `${summary.checked} checked between ${summary.startTime} - ${summary.endTime}`
    );
  } catch (error) {
    console.error("❌ [Knowlarity Sync] Failed:", error.message);
  }
}

if (knowlaritySyncEnabled) {
  setTimeout(() => runKnowlaritySync("startup"), 10_000);
  setInterval(() => runKnowlaritySync("interval"), knowlaritySyncIntervalMs);
  console.log(
    `🗓️  Knowlarity sync enabled (every ${knowlaritySyncIntervalMs / 1000} seconds)`
  );
} else {
  console.log("🛑 Knowlarity sync disabled (set KNOWLARITY_SYNC_ENABLED=false)");
}