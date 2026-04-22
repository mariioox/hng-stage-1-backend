import express from "express";
import cors from "cors";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { validate as isUuid } from "uuid";
import { parseQuery } from "./parser.js";

const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/api/profiles", async (req, res) => {
  try {
    const {
      gender,
      age_group,
      country_id,
      min_age,
      max_age,
      min_gender_probability,
      min_country_probability,
      page = 1,
      limit = 10,
      sort_by = "created_at",
      order = "desc",
    } = req.query;

    const p = Math.max(1, parseInt(page));
    const l = Math.min(50, Math.max(1, parseInt(limit)));
    const from = (p - 1) * l;
    const to = from + l - 1;

    let query = supabase.from("profiles").select("*", { count: "exact" });

    // Filter Logic - Using lowercase to ensure matches
    if (gender) query = query.eq("gender", gender.toLowerCase());
    if (age_group) query = query.eq("age_group", age_group.toLowerCase());
    if (country_id) query = query.eq("country_id", country_id.toUpperCase());

    if (min_age) query = query.gte("age", parseInt(min_age));
    if (max_age) query = query.lte("age", parseInt(max_age));

    //Probability Filters
    if (min_gender_probability)
      query = query.gte(
        "gender_probability",
        parseFloat(min_gender_probability),
      );
    if (min_country_probability)
      query = query.gte(
        "country_probability",
        parseFloat(min_country_probability),
      );

    const { data, count, error } = await query
      .order(sort_by, { ascending: order === "asc" })
      .range(from, to);

    if (error) throw error;

    return res.status(200).json({
      status: "success",
      page: p,
      limit: l,
      total: count || 0,
      data: data || [],
    });
  } catch (err) {
    // If error is a Supabase error
    if (err.code === "PGRST100") {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid query parameters" });
    }
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

app.get("/api/profiles/:id", async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid ID format",
    });
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" });
    }
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

app.get("/api/profiles/search", async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === "") {
    return res
      .status(400)
      .json({ status: "error", message: "Missing or empty parameter" });
  }

  const extractedFilters = parseQuery(q);
  if (!extractedFilters) {
    return res
      .status(400)
      .json({ status: "error", message: "Unable to interpret query" });
  }

  req.query = { ...req.query, ...extractedFilters };
  return app._router.handle(req, res, () => {});
});

app.listen(process.env.PORT || 3000, () => console.log("🚀 Server running"));
