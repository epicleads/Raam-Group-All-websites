const { insertLead, getAllLeads } = require("../services/leadsService");

function normalizeCarDekhoPayload(payload) {
  return {
    platform: "CarDekho",
    name:
      payload.name ??
      payload.customer_name ??
      payload.contact_name ??
      payload.full_name ??
      null,
    phone_number:
      payload.phone_number ??
      payload.phone ??
      payload.mobile ??
      payload.customer_mobile ??
      payload.contact_phone ??
      null,
    car_model:
      payload.car_model ?? payload.vehicle_model ?? payload.model ?? null,
    lead_url:
      payload.lead_url ??
      payload.page_url ??
      payload.lead_detail_url ??
      payload.url ??
      null,
    payload,
  };
}

function normalizeCarWalePayload(payload) {
  return {
    platform: "CarWale",
    name:
      payload.name ??
      payload.customer_name ??
      payload.contact_name ??
      payload.full_name ??
      null,
    phone_number:
      payload.phone_number ??
      payload.phone ??
      payload.mobile ??
      payload.customer_mobile ??
      payload.contact_phone ??
      null,
    car_model:
      payload.car_model ?? payload.vehicle_model ?? payload.model ?? null,
    lead_url:
      payload.lead_url ??
      payload.page_url ??
      payload.lead_detail_url ??
      payload.url ??
      null,
    payload,
  };
}

function validateLeadPayload(res, leadData) {
  const missingFields = [];

  if (!leadData.name) missingFields.push("name");
  if (!leadData.phone_number) missingFields.push("phone_number");

  if (missingFields.length) {
    res.status(400).json({
      error: `Missing required fields: ${missingFields.join(", ")}`,
    });
    return false;
  }

  return true;
}

async function createCarDekhoLead(req, res) {
  try {
    const leadData = normalizeCarDekhoPayload(req.body || {});

    if (!validateLeadPayload(res, leadData)) return;

    await insertLead(leadData);
    res.status(201).json({ message: "CarDekho lead inserted successfully" });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

async function createCarWaleLead(req, res) {
  try {
    const leadData = normalizeCarWalePayload(req.body || {});

    if (!validateLeadPayload(res, leadData)) return;

    await insertLead(leadData);
    res.status(201).json({ message: "CarWale lead inserted successfully" });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

async function getLeads(req, res) {
  try {
    const {
      platform,
      status,
      fromDate,
      toDate,
      search,
    } = req.query;

    const leads = await getAllLeads({
      platform,
      status,
      fromDate,
      toDate,
      search,
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createCarDekhoLead,
  createCarWaleLead,
  getLeads,
};
