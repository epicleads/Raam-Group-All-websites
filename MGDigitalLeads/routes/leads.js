const express = require("express");
const router = express.Router();
const {
  createCarDekhoLead,
  createCarWaleLead,
  createKnowlarityLead,
  getLeads,
  syncMetaLeadsController,
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
router.post(
  "/source/knowlarity",
  requireSourceApiKey("knowlarity"),
  createKnowlarityLead
);
router.post("/source/meta/sync", syncMetaLeadsController);

// GET all leads (for dashboard)
router.get("/", getLeads);

module.exports = router;
