import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: "Hello"
    });
    console.log('3.7:', res.text);
  } catch(e) {
    console.error('3.7 ERROR:', e);
  }
}
run();
