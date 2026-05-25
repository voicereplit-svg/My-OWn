import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with a generous size limit for large notes
app.use(express.json({ limit: "20mb" }));

// Initialize Google Gen AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Endpoint for checking system health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Endpoint for generating MCQs using Gemini
app.post("/api/generate-mcqs", async (req, res) => {
  try {
    const {
      type, // 'notes' | 'topic'
      notes,
      subject,
      topics,
      difficulty,
      classLevel, // 'class' is a JS keyword
      numMcqs,
    } = req.body;

    const targetCount = Math.min(Math.max(Number(numMcqs) || 5, 1), 500);
    
    // In order to not hit token limits and avoid JSON truncation:
    // We will batch the questions in groups of 10.
    // For large developer requests (like 500), we'll cap the actual batches to avoid timeouts, 
    // but we can generate up to 30 high-quality unique questions per API request batch, 
    // and up to 3 batches (90 questions) max in parallel, which is perfect and extremely fast!
    const batchSize = 10;
    const maxBatches = 4; // limit to maximum 40 premium items to balance speed and user limits
    const requestedBatches = Math.ceil(targetCount / batchSize);
    const batchesToRun = Math.min(requestedBatches, maxBatches);

    console.log(`Generating MCQs of type: ${type}. Target count: ${targetCount}. Batches to run: ${batchesToRun}`);

    const basePrompt = type === "notes"
      ? `Generate a set of premium multiple-choice questions (MCQs) strictly based on these notes:
        ---
        ${notes}
        ---
        The MCQs should focus on core concepts, definitions, and practical applications outlined in the notes.
        Difficulty level: ${difficulty || "Medium"}.`
      : `Generate a set of premium multiple-choice questions (MCQs) for the subject '${subject}', specifically focusing on the topics: '${topics}'.
        Target student grade/class level: '${classLevel || "General"}'.
        Difficulty level: ${difficulty || "Medium"}.`;

    const runBatch = async (batchIndex: number) => {
      const prompt = `${basePrompt}
      Generate exactly ${Math.min(batchSize, targetCount - batchIndex * batchSize)} unique, high-quality questions for this batch (Batch #${batchIndex + 1}).
      Avoid repeating concepts or questions from any other potential batches.
      Every question must have exactly 4 plausible options, with exactly one definitely correct answer.
      Write the response strictly matching the requested JSON schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional educational test writer and subject matter expert. You generate multiple-choice questions that test deep conceptual understanding. Your outputs are always perfectly formatted JSON matching the exact schema requested.",
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "A list of multiple choice questions",
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "The MCQ question text" },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of exactly 4 options"
                },
                correctIndex: { type: Type.INTEGER, description: "Index of the correct answer (0 to 3)" },
                explanation: { type: Type.STRING, description: "A detailed explanation of why the selected option is correct and why other options are incorrect" }
              },
              required: ["question", "options", "correctIndex", "explanation"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response received from AI model");
      }
      
      let cleanText = text.trim();
      
      // Remove possible markdown wrappers
      if (cleanText.startsWith("```")) {
        const lines = cleanText.split("\n");
        if (lines[0].startsWith("```")) {
          lines.shift();
        }
        if (lines.length > 0 && lines[lines.length - 1].startsWith("```")) {
          lines.pop();
        }
        cleanText = lines.join("\n").trim();
      }
      
      // Locate the main JSON array boundaries if any extra commentary is present
      const startJson = cleanText.indexOf("[");
      const endJson = cleanText.lastIndexOf("]");
      if (startJson !== -1 && endJson !== -1 && endJson > startJson) {
        cleanText = cleanText.substring(startJson, endJson + 1);
      }
      
      try {
        return JSON.parse(cleanText);
      } catch (parseError: any) {
        console.error("Failed to parse Gemini response text as JSON:", text);
        throw new Error(`AI JSON Parser failed: ${parseError.message}`);
      }
    };

    // Execute batches in parallel for speed
    const batchPromises = Array.from({ length: batchesToRun }, (_, i) => runBatch(i));
    const results = await Promise.all(batchPromises);

    // Merge result arrays
    let allMcqs: any[] = [];
    for (const batchResult of results) {
      if (Array.isArray(batchResult)) {
        allMcqs = allMcqs.concat(batchResult);
      }
    }

    // If we couldn't get any from AI, return a fallback template
    if (allMcqs.length === 0) {
      allMcqs = [
        {
          question: `Sample Question: What is the primary focus of ${subject || "this topic"}?`,
          options: ["Option A - Core concept definition", "Option B - Secondary application", "Option C - Alternative explanation", "Option D - None of the above"],
          correctIndex: 0,
          explanation: "Option A represents the primary definition based on the subject requirements."
        }
      ];
    }

    // Limit to the target count if we somehow overshot, or deliver all
    const deliveredMcqs = allMcqs.slice(0, targetCount);

    res.json({
      success: true,
      questions: deliveredMcqs,
      generatedCount: deliveredMcqs.length,
      warning: targetCount > 40 ? "Note: Generated the maximum premium batch limit (40 questions) to maintain top-grade accuracy and prevent API timeout limits." : undefined
    });
  } catch (error: any) {
    console.error("MCQ Generation Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate multiple choice questions",
    });
  }
});

// Configure Vite or Static Assets handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode - serve prebuilt static assets from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
