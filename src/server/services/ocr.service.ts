import { GoogleGenAI } from '@google/genai';

let genAI: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not configured');
    genAI = new GoogleGenAI({ apiKey: key });
  }
  return genAI;
}
