import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function main() {
  const models = [
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest'
  ];
  
  for (const m of models) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: 'test'
      });
      console.log(`[OK] ${m}: ${res.text?.trim().substring(0, 30)}`);
    } catch(e: any) {
      console.log(`[FAIL] ${m}: code ${e.status || e.code} - ${e.message?.substring(0, 80)}`);
    }
  }
}

main();
