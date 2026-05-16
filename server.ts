import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Smart Note Processing Endpoint
 * Handles both converting voice text to structured notes 
 * and performing smart calculations.
 */
app.post("/api/process-note", async (req, res) => {
  try {
    const { text, type } = req.body; // type: 'voice' | 'smart'

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const systemInstruction = type === 'voice' 
      ? `You are an expert secretary. Convert the following messy speech transcript into a clean, structured note. 
         Identify lists, prices, and important points. 
         If there are calculations or prices, summarize them at the end.
         Language: Indonesian (as requested by user).
         Format the output nicely using Markdown.`
      : `You are a smart note assistant. Look for any numerical calculations or lists of prices in the text. 
         Sum them up and add a clear "Total:" or calculation summary at the end of the note if it's not already there.
         Keep the original content but improve clarity and formatting if needed.
         Language: Indonesian.
         Format the output nicely using Markdown.`;

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: text,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      },
    });

    res.json({ processedText: result.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Failed to process note" });
  }
});

// Vite middleware for development
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();
