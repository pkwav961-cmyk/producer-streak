import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const getGeminiResponse = async (prompt: string, systemInstruction?: string) => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: systemInstruction || "You are BeatTrack AI, a motivating assistant for music producers. Help them stay consistent, suggest goals, and analyze productivity trends. Keep it cool, technical, and highly motivating.",
    }
  });

  return response.text;
};

export const analyzeProductivity = async (stats: any, streak: number) => {
  const prompt = `Analyze my producer stats: ${JSON.stringify(stats)}. My current streak is ${streak} days. Give me a 2-sentence feedback and 1 recommended goal for tomorrow.`;
  return getGeminiResponse(prompt);
};
