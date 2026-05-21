import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ------------------------------------------
// API ENDPOINTS
// ------------------------------------------

// Health probe
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: getGeminiClient() !== null,
    timestamp: new Date().toISOString(),
  });
});

// Chat controller: Compliance & Technical Interview Coach
app.post('/api/coach', async (req, res) => {
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(400).json({
      error: 'GEMINI_API_KEY is not configured',
      isConfigError: true,
      hint: 'To activate the interactive Chief Risk Officer AI Coach, configure your GEMINI_API_KEY in the Secrets panel in Google AI Studio.'
    });
    return;
  }

  try {
    // Format messages for @google/genai API
    // Gemini 3.5-flash expects format for contents: { role: string, parts: [{ text: string }] }[]
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: `You are a veteran Chief Risk Officer (CRO) at LendingClub and a world-class Credit Risk quantitative interviewer. Your goal is to coach the candidate (the user) on standard probability of default (PD) modeling, scorecard scaling, Weight of Evidence (WoE) binning, Information Value (IV) selection constraints, logistic coefficients, and Basel II/III / IFRS 9 regulations. 
Keep your responses educational, professional, and structured. 
Use markdown bullet points, list standard interview questions, and explain equations like WoE: ln(Good% / Bad%) clearly when asked. 
Be rigorous and helpful—no fluff.`,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "I apologize, but I could not formulate a clear response right now. Let us discuss other scorecard options.";
    res.json({ text: replyText });
  } catch (err: any) {
    console.error('Error in AI Coach:', err);
    res.status(500).json({
      error: err.message || 'An unexpected error occurred during model analysis.'
    });
  }
});

// ------------------------------------------
// VITE MIDDLEWARE & CLIENT ROUTING
// ------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA Fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LendingClub PD Modeling Center running on http://localhost:${PORT}`);
  });
}

startServer();
