const express = require("express");
const router = express.Router();
const {
  createCarDekhoLead,
  createCarWaleLead,
  getLeads,
} = require("../controllers/leadsController");
const { requireSourceApiKey } = require("../middleware/apiKeyAuth");

// Versioned & Professional API URLs
router.post(
  "/source/cardekho",
  requireSourceApiKey("cardekho"),
  createCarDekhoLead
);
router.post(
  "/source/carwale",
  requireSourceApiKey("carwale"),
  createCarWaleLead
);

// GET all leads (for dashboard)
router.get("/", getLeads);

module.exports = router;
