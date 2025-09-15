const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * @route POST /admin/epic-toyota/leads
 * @desc Create a new lead
 * @body { name, phone, service }
 */
router.post("/leads", async (req, res) => {
  try {
    const { name, phone, service } = req.body;

    if (!name || !phone || !service) {
      return res
        .status(400)
        .json({ ok: false, message: "Name, phone, and service are required" });
    }

    const { data, error } = await supabase
      .from("epic_toyota_leads")
      .insert([{ name, phone, service }])
      .select()
      .single();

    if (error) throw error;

    res.json({ ok: true, data });
  } catch (err) {
    console.error("Error creating lead:", err);
    res.status(500).json({ ok: false, message: "Failed to create lead" });
  }
});

/**
 * @route GET /admin/epic-toyota/leads
 * @desc Get all leads
 */
router.get("/leads", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("epic_toyota_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ ok: true, data });
  } catch (err) {
    console.error("Error fetching leads:", err);
    res.status(500).json({ ok: false, message: "Failed to fetch leads" });
  }
});

/**
 * @route GET /admin/epic-toyota/leads/:id
 * @desc Get single lead by ID
 */
router.get("/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("epic_toyota_leads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json({ ok: true, data });
  } catch (err) {
    console.error("Error fetching lead:", err);
    res.status(500).json({ ok: false, message: "Failed to fetch lead" });
  }
});

/**
 * @route DELETE /admin/epic-toyota/leads/:id
 * @desc Delete lead by ID
 */
router.delete("/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("epic_toyota_leads")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ ok: true, message: "Lead deleted successfully" });
  } catch (err) {
    console.error("Error deleting lead:", err);
    res.status(500).json({ ok: false, message: "Failed to delete lead" });
  }
});

module.exports = router;
