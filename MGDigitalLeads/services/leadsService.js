const supabase = require("../supabaseClient");

function buildInsertPayload(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
}

async function insertLead(data) {
  const insertPayload = buildInsertPayload(data);

  const { error } = await supabase
    .from("mg-digital-leads")
    .insert([insertPayload]);

  if (error) throw error;
}

async function getAllLeads(filters = {}) {
  const {
    platform,
    status,
    fromDate,
    toDate,
    search,
  } = filters;

  let query = supabase
    .from("mg-digital-leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (platform) {
    query = query.eq("platform", platform);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (fromDate) {
    const from = new Date(fromDate);
    if (!Number.isNaN(from.getTime())) {
      query = query.gte("created_at", from.toISOString());
    }
  }

  if (toDate) {
    const to = new Date(toDate);
    if (!Number.isNaN(to.getTime())) {
      query = query.lte("created_at", to.toISOString());
    }
  }

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      `name.ilike.${pattern},phone_number.ilike.${pattern},car_model.ilike.${pattern}`
    );
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

async function leadExistsByExternalId(platform, externalId, options = {}) {
  if (!externalId) return false;

  const column = options.column || "id";
  const { data, error } = await supabase
    .from("mg-digital-leads")
    .select("id")
    .eq("platform", platform)
    .eq(`payload->>${column}`, externalId.toString())
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

module.exports = { insertLead, getAllLeads, leadExistsByExternalId };
