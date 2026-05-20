import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { SYS } from './src/data.js';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routing for Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: { message: "API key not configured on server. Please add GEMINI_API_KEY to environment variables." } });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Transform messages for Gemini
      // Assuming frontend sends {role: 'user'|'assistant', content: string}
      const contents = req.body.messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: SYS,
        }
      });

      // We expect the frontend to read data.content as array of {text: string} 
      // or similar, but looking at frontend: `data.content?.map((b: any) => b.text || '').join('') || '';`
      // So let's construct that response format
      res.json({ content: [{ text: response.text }] });
    } catch (e: any) {
      if (e.status === 429 || e.message?.includes('429') || e.message?.includes('quota')) {
        res.status(429).json({ error: { message: "الـ AI تعبان شوية من كتر الطلبات 😅 (Quota Limit Reached). استنى شوية أو ضيف الـ API Key بتاعك من الإعدادات." } });
      } else {
        res.status(500).json({ error: { message: e.message } });
      }
    }
  });

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

startServer();
