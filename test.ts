import { GoogleGenAI } from "@google/genai";
console.log("process.env.GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log("Success");
