const axios = require("axios");
const supabase = require("../supabaseClient");
const { insertLead, leadExistsByExternalId } = require("./leadsService");

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v20.0";
const META_API_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const AUTO_SENTINEL = "AUTO";
const META_SYNC_STATE_TABLE = "meta_sync_state";

async function getLastSyncedAt() {
  const { data, error } = await supabase
    .from(META_SYNC_STATE_TABLE)
    .select("last_synced_at")
    .eq("id", true)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data?.last_synced_at || null;
}

async function setLastSyncedAt(timestamp) {
  if (!timestamp) return;

  const { error } = await supabase.from(META_SYNC_STATE_TABLE).upsert(
    {
      id: true,
      last_synced_at: timestamp,
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}
const FORM_IDS = [
  "1911631042761097",
  "1177214030405317",
  "2233046613850717",
  "1142952454158652",
  "1186534720034845",
  "2078391796302886",
  "1394151142333386",
  "1048961653862968",
  "774742268656801",
  "713624807778467",
  "1160277712669317",
  "2570583109984694",
  "1294719349065144",
  "1497882231356260",
  "1072245428157243",
  "820174200534919",
  "801291529291747",
  "1187856199827173",
  "2607746889586603",
  "1096095362699313",
  "1320003423008731",
  "2137998907019720",
  "830532212876097",
  "1179972323959598",
  "1554565945926571",
];

function requireEnv(name, value) {
  if (!value) {
    throw new Error(
      `${name} is required for Meta lead sync but was not found in the environment.`
    );
  }
  return value;
}

function parseFormIds(bodyFormIds, envFormIds) {
  const merged = new Set(FORM_IDS);

  if (Array.isArray(bodyFormIds)) {
    bodyFormIds.forEach((id) => {
      if (typeof id === "string") {
        const trimmed = id.trim();
        if (trimmed) merged.add(trimmed);
      }
    });
  }

  if (typeof envFormIds === "string" && envFormIds.trim()) {
    envFormIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .forEach((id) => merged.add(id));
  }

  const unique = Array.from(merged).filter((id) => /^\d+$/.test(id));

  return {
    formIds: unique,
    autoRequested: true,
  };
}

function handleAxiosError(error, context) {
  if (error.response) {
    const metaMessage =
      error.response.data?.error?.message ||
      JSON.stringify(error.response.data);
    throw new Error(`${context} failed: ${metaMessage}`);
  }
  throw error;
}

async function fetchLeadForms(pageId, accessToken) {
  const url = `${META_API_BASE}/${pageId}/leadgen_forms`;
  try {
    let forms = [];
    let nextUrl = url;
    let params = {
      access_token: accessToken,
      limit: 100,
    };

    while (nextUrl) {
      const { data } = await axios.get(nextUrl, { params });
      if (Array.isArray(data?.data)) {
        forms = forms.concat(data.data);
      }

      if (data?.paging?.next) {
        nextUrl = data.paging.next;
        params = undefined;
      } else {
        nextUrl = null;
      }
    }

    return forms.filter((form) => form?.status === "ACTIVE");
  } catch (error) {
    handleAxiosError(error, "Fetching Meta lead forms");
  }
}

function buildFilteringParam({ since, until }) {
  const filters = [];

  if (since) {
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) {
      filters.push({
        field: "time_created",
        operator: "GREATER_THAN",
        value: Math.floor(sinceDate.getTime() / 1000),
      });
    }
  }

  if (until) {
    const untilDate = new Date(until);
    if (!Number.isNaN(untilDate.getTime())) {
      filters.push({
        field: "time_created",
        operator: "LESS_THAN",
        value: Math.floor(untilDate.getTime() / 1000),
      });
    }
  }

  return filters.length ? JSON.stringify(filters) : undefined;
}

async function fetchLeadsForForm(formId, accessToken, params = {}) {
  let results = [];
  let nextUrl = `${META_API_BASE}/${formId}/leads`;
  const filtering = buildFilteringParam({
    since: params.since,
    until: params.until,
  });
  let query = {
    access_token: accessToken,
    limit: params.limit || 100,
  };

  if (filtering) {
    query.filtering = filtering;
  }

  while (nextUrl) {
    let data;
    try {
      ({ data } = await axios.get(nextUrl, { params: query }));
    } catch (error) {
      handleAxiosError(error, `Fetching leads for form ${formId}`);
    }
    if (Array.isArray(data?.data)) {
      results = results.concat(data.data);
    }

    if (data?.paging?.next) {
      nextUrl = data.paging.next;
      query = undefined; // paging.next already includes params
    } else {
      nextUrl = null;
    }
  }

  return results;
}

function extractField(fields, nameList) {
  for (const name of nameList) {
    if (fields[name]) {
      return fields[name];
    }
  }
  return null;
}

function normalizeMetaLead(rawLead, formMeta) {
  const fields = {};
  if (Array.isArray(rawLead.field_data)) {
    for (const entry of rawLead.field_data) {
      const key = entry.name;
      const value = Array.isArray(entry.values) ? entry.values[0] : entry.values;
      if (key) {
        fields[key] = value;
      }
    }
  }

  const phone = extractField(fields, [
    "phone_number",
    "phone",
    "mobile_phone",
    "mobile",
    "phone_number_with_country_code",
  ]);

  const firstName = extractField(fields, ["first_name"]);
  const lastName = extractField(fields, ["last_name"]);
  const fullName =
    extractField(fields, ["full_name", "name"]) ||
    [firstName, lastName].filter(Boolean).join(" ");

  const name =
    (fullName && fullName.trim()) ||
    (phone ? `Meta Lead ${phone}` : "Meta Lead");

  const carModel = extractField(fields, [
    "car_model",
    "vehicle_model",
    "interested_model",
    "model",
  ]);

  const leadUrl = rawLead.id
    ? `https://www.facebook.com/ads/leadgen/${rawLead.id}`
    : null;

  return {
    platform: "Meta",
    name,
    phone_number: phone,
    car_model: carModel,
    lead_url: leadUrl,
    payload: {
      id: rawLead.id,
      created_time: rawLead.created_time,
      form_id: rawLead.form_id,
      adgroup_id: rawLead.adgroup_id,
      ad_id: rawLead.ad_id,
      campaign_id: rawLead.campaign_id,
      fields,
      form_name: formMeta?.name,
    },
  };
}

async function syncMetaLeads(options = {}) {
  const accessToken = requireEnv(
    "META_PAGE_ACCESS_TOKEN",
    process.env.META_PAGE_ACCESS_TOKEN
  );

  const pageId = requireEnv("META_PAGE_ID", process.env.META_PAGE_ID);

  const { formIds: configuredFormIds, autoRequested } = parseFormIds(
    options.formIds,
    process.env.META_FORM_IDS_DEFAULT
  );
  const lastSyncedAt = await getLastSyncedAt();

  const syncSummary = {
    formsProcessed: 0,
    leadsChecked: 0,
    leadsInserted: 0,
    leadsSkipped: 0,
    autoDiscoveredForms: 0,
    details: [],
  };

  const now = new Date();
  const monthStartIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
  const overrideSince = process.env.META_SYNC_SINCE_OVERRIDE;

  const effectiveSince =
    options.since || overrideSince || lastSyncedAt || monthStartIso;

  let resolvedFormIds = configuredFormIds;
  let formMetadata = [];

  if (!resolvedFormIds.length || autoRequested) {
    formMetadata = await fetchLeadForms(pageId, accessToken);
    resolvedFormIds = formMetadata.map((form) => form.id);
    syncSummary.autoDiscoveredForms = resolvedFormIds.length;
  } else {
    const resolvedSet = new Set(resolvedFormIds);
    formMetadata = resolvedFormIds.map((id) => ({ id }));
    const autoForms = new Set();

    if (!resolvedSet.size || autoRequested) {
      const autoFormData = await fetchLeadForms(pageId, accessToken);
      autoFormData.forEach((f) => {
        resolvedSet.add(f.id);
        autoForms.add(f.id);
      });
    }

    resolvedFormIds = Array.from(resolvedSet);
    syncSummary.autoDiscoveredForms = autoForms.size;
    formMetadata = resolvedFormIds.map((id) => ({ id }));
  }

  if (!resolvedFormIds.length) {
    return {
      ...syncSummary,
      message:
        "No lead forms found. Meta returned zero active forms. Confirm page access and permissions.",
    };
  }

  syncSummary.formsProcessed = resolvedFormIds.length;

  let latestLeadTime = lastSyncedAt ? new Date(lastSyncedAt) : null;

  for (const formMeta of formMetadata) {
    const formId = formMeta.id;
    const leads = await fetchLeadsForForm(formId, accessToken, {
      since: effectiveSince,
      until: options.until,
      limit: options.limit,
    });

    syncSummary.leadsChecked += leads.length;

    for (const lead of leads) {
      const normalized = normalizeMetaLead(lead, formMeta);

      if (!normalized.phone_number) {
        syncSummary.leadsSkipped += 1;
        syncSummary.details.push({
          formId,
          leadId: lead.id,
          reason: "Missing phone number",
        });
        continue;
      }

      const exists = await leadExistsByExternalId(
        "Meta",
        lead.id
      );

      if (exists) {
        syncSummary.leadsSkipped += 1;
        continue;
      }

      await insertLead(normalized);
      syncSummary.leadsInserted += 1;

      if (lead.created_time) {
        const createdAt = new Date(lead.created_time);
        if (
          !Number.isNaN(createdAt.getTime()) &&
          (!latestLeadTime || createdAt > latestLeadTime)
        ) {
          latestLeadTime = createdAt;
        }
      }
    }
  }

  syncSummary.message = "Meta lead sync completed.";
  if (latestLeadTime && (!lastSyncedAt || latestLeadTime > new Date(lastSyncedAt))) {
    const latestIso = latestLeadTime.toISOString();
    await setLastSyncedAt(latestIso);
    syncSummary.lastSyncedAt = latestIso;
  }

  return syncSummary;
}

module.exports = {
  syncMetaLeads,
};

