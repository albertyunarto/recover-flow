import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIParsedFoodItem } from "@/types";

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return _genAI;
}

let _model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;
function getModel() {
  if (!_model) {
    _model = getGenAI().getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });
  }
  return _model;
}

const NUTRITION_PROMPT = `You are a nutrition estimation assistant specializing in Southeast Asian and international foods.
Given a free-text description of a meal, parse it into individual food items and estimate the nutritional content of each.

Rules:
- Parse multiple food items from a single description (e.g. "chicken rice and teh c kosong" = 2 items)
- Estimate calories, protein, carbs, and fat per item
- Use typical Singapore hawker/restaurant portion sizes when applicable
- For drinks, estimate based on standard kopitiam cup sizes (~250ml)
- If a modifier is mentioned (e.g. "extra drumstick", "less rice"), adjust estimates accordingly
- Set confidence to "high" for well-known dishes with standard portions, "medium" for reasonable estimates, "low" for vague descriptions
- Return serving_size as a human-readable string (e.g. "1 plate", "1 cup", "2 pieces")
- All numeric values should be integers
- Include a short reasoning explaining portion assumptions and data source (e.g. "Standard hawker plate with steamed chicken, oiled rice. Based on HPB Singapore data.")

Respond with ONLY valid JSON in this exact format:
{
  "items": [
    {
      "food_name": "string",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "serving_size": "string",
      "confidence": "high" | "medium" | "low",
      "reasoning": "string"
    }
  ]
}`;

export async function parseNutritionFromText(
  description: string
): Promise<{ items: AIParsedFoodItem[] } | { error: string }> {
  if (!process.env.GEMINI_API_KEY) {
    return { error: "AI features not configured. Please add a GEMINI_API_KEY." };
  }

  try {
    const result = await getModel().generateContent([
      NUTRITION_PROMPT,
      `Meal description: "${description}"`,
    ]);

    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (!parsed.items || !Array.isArray(parsed.items)) {
      return { error: "Unexpected AI response format" };
    }

    return { items: parsed.items as AIParsedFoodItem[] };
  } catch (err) {
    console.error("Gemini API error:", err);
    return { error: "Failed to analyze meal. Please try again." };
  }
}
