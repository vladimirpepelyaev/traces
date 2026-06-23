import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Let requests pass through for health and other checks
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Server-side Spam detection check
  app.post("/api/check-spam", (req, res) => {
    const { text, userId, userName } = req.body;
    if (!text) {
      return res.json({ match: null });
    }

    const serverRules = [
      {
         id: '1',
         name: 'Крипто-скам и лёгкий заработок',
         keywords: ['битки', 'крипта', 'пассивный доход', 'telegram-канал', 'заработок', 'крипто'],
         action: 'delete_ban',
      },
      {
         id: '2',
         name: 'Оскорбления и мат',
         keywords: ['уебок', 'долбоеб', 'нищеброд', 'сука', 'блять', 'нахуй'],
         action: 'flag_pro',
      },
      {
         id: '3',
         name: 'Накрутки и сомнительные ссылки',
         keywords: ['накрут', 'vk.cc/promo', 'cheat-vk', 'fastmoney'],
         action: 'flag_spam',
      }
    ];

    const lowerText = text.toLowerCase();
    const matched = serverRules.find(r => r.keywords.some(kw => lowerText.includes(kw.toLowerCase())));

    if (matched) {
      console.log(`[Server Spam Analyzer] Post from ${userName || 'User'} is flagged by rule "${matched.name}". Action triggered: ${matched.action}`);
      return res.json({
        match: {
          id: matched.id,
          name: matched.name,
          action: matched.action,
          keywords: matched.keywords
        }
      });
    }

    return res.json({ match: null });
  });

  if (process.env.NODE_ENV !== "production") {
    // Bulletproof SPA redirect rewrite for non-file dev paths
    app.use((req, res, next) => {
      if (req.method === "GET" && !req.path.includes(".") && !req.path.startsWith("/api/")) {
        req.url = "/";
      }
      next();
    });

    // Vite middleware for development fallback
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving with fallback
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
