import { GoogleGenAI } from '@google/genai/node';

export function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');
  return new GoogleGenAI({ apiKey });
}

export function extractText(response: any): string {
  return response.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('') ?? '';
}

export function cleanJson(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

export function applyRepetition(instruction: string): string {
  return `${instruction}\n\n[REPEATED FOR ACCURACY]:\n${instruction}`;
}
