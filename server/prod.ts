import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import messagesRouter from "./routes/messages.js";
import aiRouter from "./routes/ai.js";
import platformsRouter from "./routes/platforms.js";
import githubRouter from "./routes/github.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/messages", messagesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/platforms", platformsRouter);
app.use("/api/github", githubRouter);

const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[Nexus AI] Production server running on http://localhost:${PORT}`);
});
