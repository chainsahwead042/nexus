import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || (typeof window !== "undefined" && (window as any).__GEMINI_API_KEY__);
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set — using fallback categorization");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export async function categorizeMessage(content: string): Promise<{
  category: "client" | "relative" | "undetermined";
  isNewClient: boolean;
}> {
  const ai = getAI();

  if (!ai) {
    const lowerContent = content.toLowerCase();
    const clientKeywords = ["hire", "project", "budget", "repo", "landing page", "changes", "react", "develop"];
    const isClient = clientKeywords.some((kw) => lowerContent.includes(kw));
    return {
      category: isClient ? "client" : "relative",
      isNewClient: isClient,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this message and determine:
1. Is this from a "client" (someone requesting business/freelance work), a "relative" (personal contact), or "undetermined"?
2. Is this a new client or existing?

Message: "${content}"

Respond ONLY with JSON in this format:
{"category": "client"|"relative"|"undetermined", "isNewClient": true|false}`,
            },
          ],
        },
      ],
    });

    const text = response.text?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || "undetermined",
        isNewClient: parsed.isNewClient ?? false,
      };
    }
  } catch (err) {
    console.error("AI categorization failed:", err);
  }

  return { category: "undetermined", isNewClient: false };
}

export async function extractRequirements(content: string): Promise<string> {
  const ai = getAI();

  if (!ai) {
    return `Requirements extracted from message:\n\n${content}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Extract structured technical requirements from this client message. Format them as a clear, actionable list for a developer.

Message: "${content}"

Provide concise, specific requirements:`,
            },
          ],
        },
      ],
    });

    return response.text?.trim() || content;
  } catch (err) {
    console.error("AI requirements extraction failed:", err);
    return content;
  }
}
