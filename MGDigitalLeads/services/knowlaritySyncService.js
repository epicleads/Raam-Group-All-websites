const {
  insertLead,
  leadExistsByExternalId,
} = require("./leadsService");

const KNOWLARITY_API_URL =
  process.env.KNOWLARITY_API_URL ||
  "https://kpi.knowlarity.com/Basic/v1/account/calllog";
const KNOWLARITY_API_KEY = process.env.KNOWLARITY_API_KEY;
const KNOWLARITY_AUTH_TOKEN = process.env.KNOWLARITY_AUTH_TOKEN;
const KNOWLARITY_CHANNEL = process.env.KNOWLARITY_CHANNEL || "Basic";

const LOOKBACK_MINUTES =
  Number(process.env.KNOWLARITY_SYNC_LOOKBACK_MINUTES) || 15;
const PAGE_SIZE =
  Number(process.env.KNOWLARITY_SYNC_PAGE_SIZE) || 100;

let lastSyncedAt = null;

function formatKnowlarityDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

function normalizeKnowlarityRecord(record) {
  const phone =
    record.customer_number ??
    record.caller_id ??
    null;

  const metaDate = record.start_time
    ? new Date(record.start_time)
    : null;

  return {
    platform: "Knowlarity",
    name: phone ? `Knowlarity Lead ${phone}` : "Knowlarity Lead",
    phone_number: phone,
    status: record.business_call_type || "call",
    meta_created_at:
      metaDate && !Number.isNaN(metaDate.getTime())
        ? metaDate.toISOString()
        : null,
    car_model: null,
    lead_url: null,
    payload: record,
  };
}

async function fetchKnowlarityPage(params) {
  const { startTime, endTime, limit, offset } = params;
  const url = new URL(KNOWLARITY_API_URL);
  url.searchParams.set("start_time", formatKnowlarityDate(startTime));
  url.searchParams.set("end_time", formatKnowlarityDate(endTime));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url.toString(), {
    headers: {
      "x-api-key": KNOWLARITY_API_KEY,
      authorization: KNOWLARITY_AUTH_TOKEN,
      channel: KNOWLARITY_CHANNEL,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Knowlarity API error (${response.status}): ${text}`
    );
  }

  return response.json();
}

async function syncKnowlarityCalls(options = {}) {
  if (!KNOWLARITY_API_KEY || !KNOWLARITY_AUTH_TOKEN) {
    throw new Error(
      "Knowlarity credentials missing. Set KNOWLARITY_API_KEY and KNOWLARITY_AUTH_TOKEN."
    );
  }

  const now = options.endTime ? new Date(options.endTime) : new Date();
  const startTime = options.startTime
    ? new Date(options.startTime)
    : lastSyncedAt ||
      new Date(now.getTime() - LOOKBACK_MINUTES * 60 * 1000);

  const limit = options.limit || PAGE_SIZE;
  let offset = options.offset || 0;
  let totalInserted = 0;
  let totalChecked = 0;
  let totalSkipped = 0;

  let hasMore = true;

  while (hasMore) {
    const page = await fetchKnowlarityPage({
      startTime,
      endTime: now,
      limit,
      offset,
    });

    const records = page.objects || [];
    totalChecked += records.length;

    for (const record of records) {
      const externalId = record.uuid;

      if (externalId) {
        const exists = await leadExistsByExternalId(
          "Knowlarity",
          externalId.toString(),
          { column: "uuid" }
        );

        if (exists) {
          totalSkipped += 1;
          continue;
        }
      }

      const normalized = normalizeKnowlarityRecord(record);
      if (!normalized.phone_number) {
        totalSkipped += 1;
        continue;
      }

      await insertLead(normalized);
      totalInserted += 1;
    }

    offset += records.length;

    const totalCount = page.meta?.total_count;
    if (!records.length || offset >= totalCount || records.length < limit) {
      hasMore = false;
    }
  }

  lastSyncedAt = now;

  return {
    startTime: startTime.toISOString(),
    endTime: now.toISOString(),
    inserted: totalInserted,
    checked: totalChecked,
    skipped: totalSkipped,
  };
}

module.exports = {
  syncKnowlarityCalls,
};

