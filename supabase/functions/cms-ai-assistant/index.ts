// Lovable AI–powered CMS assistant: generates/refreshes metadata and auto-categorizes movies.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type Action = "generate_metadata" | "refresh_metadata" | "categorize";

interface Body {
  action: Action;
  title?: string;
  current?: Record<string, unknown>;
  categories?: { id: string; name: string }[];
}

const tools = {
  metadata: {
    type: "function",
    function: {
      name: "set_movie_metadata",
      description: "Return rich movie metadata.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "2–4 sentence engaging synopsis." },
          year: { type: "integer" },
          duration: { type: "integer", description: "Runtime in minutes." },
          rating: { type: "number", description: "0–10 critic-style rating." },
          genres: { type: "array", items: { type: "string" }, description: "1–4 genres." },
          cast_list: { type: "array", items: { type: "string" }, description: "3–6 leading cast members." },
          director: { type: "string" },
          country: { type: "string" },
          language: { type: "string" },
          content_rating: { type: "string", description: "e.g. PG-13, R, TV-MA." },
          badge: { type: "string", description: "Short marketing tagline (≤30 chars). Empty if not notable." },
        },
        required: ["description", "genres", "cast_list"],
        additionalProperties: false,
      },
    },
  },
  category: {
    type: "function",
    function: {
      name: "suggest_categories",
      description: "Rank the most likely catalog categories for the movie with confidence scores.",
      parameters: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            description: "Up to 5 best-matching categories ordered by confidence (highest first). Only include real candidates with confidence ≥ 0.1.",
            items: {
              type: "object",
              properties: {
                category_id: { type: "string", description: "Must match one of the provided category ids exactly." },
                confidence: { type: "number", description: "0.0–1.0 likelihood this is the right category." },
                reason: { type: "string", description: "One short sentence explaining the fit." },
              },
              required: ["category_id", "confidence", "reason"],
              additionalProperties: false,
            },
          },
        },
        required: ["suggestions"],
        additionalProperties: false,
      },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Body;
    const { action } = body;
    if (!action) return json({ error: "action is required" }, 400);

    let messages: { role: string; content: string }[] = [];
    let toolDef = tools.metadata;

    if (action === "generate_metadata") {
      if (!body.title?.trim()) return json({ error: "title required" }, 400);
      messages = [
        { role: "system", content: "You are a film catalog editor. Invent plausible, engaging metadata for fictional or real titles. Always call the tool." },
        { role: "user", content: `Generate metadata for the movie titled "${body.title}".` },
      ];
    } else if (action === "refresh_metadata") {
      messages = [
        { role: "system", content: "You are a film catalog editor. Improve and fill in any missing fields without contradicting existing data. Always call the tool with the FULL updated metadata." },
        { role: "user", content: `Refresh metadata for this movie. Keep good existing values, improve weak ones, fill missing ones.\n\n${JSON.stringify(body.current ?? {}, null, 2)}` },
      ];
    } else if (action === "categorize") {
      if (!body.categories?.length) return json({ error: "categories required" }, 400);
      toolDef = tools.category;
      const list = body.categories.map((c) => `- ${c.id}: ${c.name}`).join("\n");
      messages = [
        { role: "system", content: "You assign movies to the best matching catalog category. Pick exactly one id from the list. Always call the tool." },
        { role: "user", content: `Categories:\n${list}\n\nMovie:\n${JSON.stringify(body.current ?? { title: body.title }, null, 2)}` },
      ];
    } else {
      return json({ error: "unknown action" }, 400);
    }

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: toolDef.function.name } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limit exceeded, please try again shortly." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) return json({ error: "AI returned no structured output" }, 502);

    let parsed: Record<string, unknown>;
    try {
      parsed = typeof args === "string" ? JSON.parse(args) : args;
    } catch {
      return json({ error: "Invalid AI JSON" }, 502);
    }

    return json({ result: parsed });
  } catch (e) {
    console.error("cms-ai-assistant error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
