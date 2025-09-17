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
const mgRouter = require("./raam-mg/router");
const mgLeadsRoute = require("./raam-mg/mg_leads");

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
app.use("/admin", herosSectionAdmin);
app.use("/admin", adminBlogRoute);
app.use("/admin", heroReassuredBanner);
app.use("/admin", inventoryReassured);
app.use("/admin", reassured_leads);
app.use("/admin/ads", adsRoute);
app.use("/admin/epic-toyota", landingPageBanner);
app.use("/admin/raam-mg", mgRouter);
app.use("/admin/raam-mg", mgLeadsRoute);

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