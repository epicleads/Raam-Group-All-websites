const SOURCE_KEYS = {
  cardekho: process.env.LEAD_API_KEY_CARDEKHO,
  carwale: process.env.LEAD_API_KEY_CARWALE,
  meta: "raam-digital-2025-supersecret-meta",
  knowlarity: "raam-digital-knowlarity-2025-key",
};

function logMissingKey(source) {
  console.error(
    `❌ API key for '${source}' is not configured. Set LEAD_API_KEY_${source.toUpperCase()} in the environment.`
  );
}

function requireSourceApiKey(source) {
  return (req, res, next) => {
    const expectedKey = SOURCE_KEYS[source];

    if (!expectedKey) {
      logMissingKey(source);
      return res.status(500).json({
        error: "Server configuration error. API key missing.",
      });
    }

    const providedKey =
      req.headers["x-api-key"] || req.headers["X-API-Key"];

    if (!providedKey) {
      return res.status(401).json({ error: "Missing API key." });
    }

    if (providedKey !== expectedKey) {
      return res.status(403).json({ error: "Invalid API key." });
    }

    return next();
  };
}

module.exports = {
  requireSourceApiKey,
};

