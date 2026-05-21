import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import { SYS } from './src/data';
import { GoogleGenAI } from '@google/genai';

// Load .env if it exists, otherwise fall back to loading .env.example
if (fs.existsSync(".env")) {
  dotenv.config();
} else if (fs.existsSync(".env.example")) {
  dotenv.config({ path: ".env.example" });
}

async function startServer() {
  console.log("Starting full-stack Express server...");
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routing for Chat
  app.post("/api/chat", async (req, res) => {
    console.log("POST request received at /api/chat");
    try {
      let apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.includes("MY_GEMINI_API_KEY") || apiKey.includes("MY_")) {
        apiKey = "AIzaSyAdwFsS4zP6Ns5MOMuXVzVswUaIwMOegV0";
      }

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
        model: 'gemini-3.5-flash',
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
      const errMsg = e.message || '';
      if (e.status === 429 || errMsg.includes('429') || errMsg.includes('quota')) {
        res.status(429).json({ error: { message: "الـ AI تعبان شوية من كتر الطلبات 😅 (Quota Limit Reached). استنى شوية أو ضيف الـ API Key بتاعك من الإعدادات." } });
      } else if (e.status === 503 || errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('UNAVAILABLE')) {
        res.status(503).json({ error: { message: "الخدمة مشغولة جداً حالياً وضغط الطلبات كبير على النموذج لسرعة السيرفر 😅 (Service Temporarily Unavailable). جرب تبعت الرسالة تاني بعد شوية صغيرة." } });
      } else {
        res.status(500).json({ error: { message: errMsg } });
      }
    }
  });

  const isDev = !process.argv[1]?.includes('dist');
  if (isDev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    // Serve index.html dynamically in dev mode with Vite's HTML transforms
    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(
          path.resolve(process.cwd(), "index.html"),
          "utf-8"
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
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
