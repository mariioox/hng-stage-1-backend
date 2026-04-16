import express from "express";
import axios from "axios";
import cors from "cors";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { v7 as uuidv7, validate as isUuid } from "uuid";

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Helper Functions
const getAgeGroup = (age) => {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
};

/**
 * POST /api/profiles
 * Creates a new profile or returns an existing one (Idempotency)
 */
app.post("/api/profiles", async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res
      .status(400)
      .json({ status: "error", message: "Missing or empty name" });
  }
  if (typeof name !== "string") {
    return res.status(422).json({ status: "error", message: "Invalid type" });
  }

  const cleanName = name.toLowerCase().trim();

  try {
    // Check for existing profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("name", cleanName)
      .maybeSingle();

    if (existingProfile) {
      return res.status(201).json({
        status: "success",
        message: "Profile already exists",
        data: existingProfile,
      });
    }

    // Parallel API Fetching
    const [genderRes, ageRes, nationRes] = await Promise.all([
      axios
        .get(`https://api.genderize.io?name=${cleanName}`)
        .catch(() => ({ error: "Genderize" })),
      axios
        .get(`https://api.agify.io?name=${cleanName}`)
        .catch(() => ({ error: "Agify" })),
      axios
        .get(`https://api.nationalize.io?name=${cleanName}`)
        .catch(() => ({ error: "Nationalize" })),
    ]);

    // Strict 502 Validation
    const validate = (res, apiName) => {
      if (res.error || !res.data) throw { status: 502, api: apiName };
      if (apiName === "Genderize" && (!res.data.gender || res.data.count === 0))
        throw { status: 502, api: apiName };
      if (apiName === "Agify" && res.data.age === null)
        throw { status: 502, api: apiName };
      if (
        apiName === "Nationalize" &&
        (!res.data.country || res.data.country.length === 0)
      )
        throw { status: 502, api: apiName };
    };

    validate(genderRes, "Genderize");
    validate(ageRes, "Agify");
    validate(nationRes, "Nationalize");

    // Process Data
    const topCountry = nationRes.data.country.sort(
      (a, b) => b.probability - a.probability,
    )[0];

    const newProfile = {
      id: uuidv7(),
      name: cleanName,
      gender: genderRes.data.gender,
      gender_probability: genderRes.data.probability,
      sample_size: genderRes.data.count,
      age: ageRes.data.age,
      age_group: getAgeGroup(ageRes.data.age),
      country_id: topCountry.country_id,
      country_probability: topCountry.probability,
      created_at: new Date().toISOString(),
    };

    // Save to DB
    const { data, error: dbError } = await supabase
      .from("profiles")
      .insert([newProfile])
      .select()
      .single();

    if (dbError) throw dbError;

    return res.status(201).json({ status: "success", data });
  } catch (err) {
    console.error("DEBUG ERROR:", err);
    if (err.status === 502) {
      return res.status(502).json({
        status: "error",
        message: `${err.api} returned an invalid response`,
      });
    }
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

/**
 * GET /api/profiles
 * Lists all profiles with optional case-insensitive filtering
 */
app.get("/api/profiles", async (req, res) => {
  const { gender, country_id, age_group } = req.query;

  try {
    let query = supabase.from("profiles").select("*", { count: "exact" });

    if (gender) query = query.ilike("gender", gender);
    if (country_id) query = query.ilike("country_id", country_id);
    if (age_group) query = query.ilike("age_group", age_group);

    const { data, count, error } = await query;
    if (error) throw error;

    return res
      .status(200)
      .json({ status: "success", count: count || 0, data: data || [] });
  } catch (err) {
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

/**
 * GET /api/profiles/:id
 */
app.get("/api/profiles/:id", async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id))
    return res
      .status(400)
      .json({ status: "error", message: "Invalid ID format" });

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error && error.code === "PGRST116")
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" });
    if (error) throw error;

    return res.status(200).json({ status: "success", data });
  } catch (err) {
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

/**
 * DELETE /api/profiles/:id
 */
app.delete("/api/profiles/:id", async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id))
    return res
      .status(400)
      .json({ status: "error", message: "Invalid ID format" });

  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .single();
    if (!existing)
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" });

    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw error;

    return res.status(204).send();
  } catch (err) {
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Stage 1 live on port ${PORT}`));
