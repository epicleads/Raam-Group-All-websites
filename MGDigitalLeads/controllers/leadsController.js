const { insertLead, getAllLeads } = require("../services/leadsService");
const { syncMetaLeads } = require("../services/metaLeadsService");

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

function normalizeRunoPayload(payload) {
  const phone =
    payload.phone_number ??
    payload.phone ??
    payload.mobile ??
    payload.msisdn ??
    null;

  return {
    platform: "Runo AI",
    name:
      payload.name ??
      payload.customer_name ??
      payload.contact_name ??
      (phone ? `Runo Lead ${phone}` : "Runo Lead"),
    phone_number: phone,
    car_model:
      payload.car_model ?? payload.vehicle_model ?? payload.model ?? null,
    lead_url: payload.lead_url ?? payload.page_url ?? payload.url ?? null,
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

async function createRunoLead(req, res) {
  try {
    const leadData = normalizeRunoPayload(req.body || {});

    if (!validateLeadPayload(res, leadData)) return;

    await insertLead(leadData);
    res.status(201).json({ message: "Runo lead inserted successfully" });
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
      page,
      limit,
    } = req.query;

    const pageSize = Math.min(
      500,
      Math.max(1, parseInt(limit, 10) || 100)
    );
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (currentPage - 1) * pageSize;

    const { data, count } = await getAllLeads({
      platform,
      status,
      fromDate,
      toDate,
      search,
      limit: pageSize,
      offset,
    });

    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

    res.json({
      leads: data,
      total: count,
      page: currentPage,
      pageSize,
      totalPages,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function syncMetaLeadsController(req, res) {
  try {
    const summary = await syncMetaLeads(req.body || {});
    res.json(summary);
  } catch (error) {
    console.error("Meta sync error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createCarDekhoLead,
  createCarWaleLead,
  createRunoLead,
  getLeads,
  syncMetaLeadsController,
};
