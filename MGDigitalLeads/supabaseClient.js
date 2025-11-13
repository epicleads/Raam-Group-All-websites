require("dotenv").config({ path: "../.env" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is required but was not found in the environment.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Supabase service key is required but missing. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) in your .env."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = supabase;
