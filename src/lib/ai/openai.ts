import OpenAI from "openai";

export interface GeneratedMeal {
  day: number;
  meal_type: "breakfast" | "lunch" | "dinner";
  name: string;
  description: string;
  ingredients: string[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

export async function generateMealPlanText(params: {
  daily_calories: number;
  goal: string;
  dietary_preferences: string[];
  food_categories: string[];
}): Promise<GeneratedMeal[]> {
  const client = getOpenAIClient();

  const { daily_calories, goal, dietary_preferences, food_categories } = params;

  const goalLabel =
    goal === "lose"
      ? "lose weight"
      : goal === "gain"
        ? "gain muscle"
        : "maintain weight";

  const preferencesNote =
    dietary_preferences.length > 0
      ? `Dietary preferences to respect: ${dietary_preferences.join(", ")}.`
      : "";

  const categoriesNote =
    food_categories.length > 0
      ? `Preferred food categories: ${food_categories.join(", ")}. Build meals around these where possible.`
      : "";

  const systemPrompt = `You are a professional nutritionist and meal planner. Your task is to create a personalised 7-day meal plan.

Return a JSON object with a single key "meals" containing an array of exactly 21 meal objects — one for each combination of day (1 through 7) and meal type (breakfast, lunch, dinner).

Each meal object must have these exact fields:
- day: integer 1–7
- meal_type: "breakfast", "lunch", or "dinner"
- name: string (meal name)
- description: string (1–2 sentence description of the dish)
- ingredients: array of strings (list of main ingredients)
- calories: integer
- protein_g: number with one decimal place
- carbs_g: number with one decimal place
- fat_g: number with one decimal place

Calorie distribution guidelines per day:
- Breakfast: ~25% of daily calories (${Math.round(daily_calories * 0.25)} kcal)
- Lunch: ~35% of daily calories (${Math.round(daily_calories * 0.35)} kcal)
- Dinner: ~40% of daily calories (${Math.round(daily_calories * 0.4)} kcal)
- Total per day must sum to approximately ${daily_calories} kcal

Ensure variety across the 7 days. Do not repeat the same meal. Return only valid JSON — no markdown, no explanation.`;

  const userPrompt = `Create a 7-day meal plan for a person who wants to ${goalLabel}.
Daily calorie target: ${daily_calories} kcal.
${preferencesNote}
${categoriesNote}`.trim();

  const response = await client.chat.completions.create({
    model: "gpt-5-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  let parsed: { meals?: unknown };
  try {
    parsed = JSON.parse(content) as { meals?: unknown };
  } catch {
    throw new Error("OpenAI returned malformed JSON");
  }

  if (!Array.isArray(parsed.meals)) {
    throw new Error('OpenAI response missing "meals" array');
  }

  const meals = parsed.meals as GeneratedMeal[];

  if (meals.length !== 21) {
    throw new Error(
      `Expected 21 meals from OpenAI but received ${meals.length}`
    );
  }

  return meals;
}
