import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import http from "node:http";
import { Server } from "socket.io";
import { InterviewSession, TOTAL_QUESTIONS, type InterviewConfig } from "./interview.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Single .env at the repo root serves both client and server; a local
// server/.env (if present) takes precedence.
dotenv.config({ path: [path.join(__dirname, "../.env"), path.join(__dirname, "../../.env")] });

const PORT = Number(process.env.PORT ?? 3001);
// Comma-separated list of allowed client origins (prod URL, previews, localhost).
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, questions: TOTAL_QUESTIONS });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN } });

io.on("connection", (socket) => {
  let session: InterviewSession | null = null;

  socket.on("interview:start", async (config: InterviewConfig) => {
    try {
      session = new InterviewSession({
        type: config.type,
        difficulty: config.difficulty,
        company: String(config.company || "a top tech company").slice(0, 120),
      });
      const question = await session.firstQuestion();
      socket.emit("interview:question", {
        index: 1,
        total: TOTAL_QUESTIONS,
        text: question,
      });
    } catch (err) {
      console.error("interview:start failed:", err);
      socket.emit("interview:error", { message: errorMessage(err) });
    }
  });

  socket.on("interview:answer", async ({ text }: { text: string }) => {
    if (!session) {
      socket.emit("interview:error", { message: "No active interview session." });
      return;
    }
    const answeredIndex = session.questionCount;
    try {
      const { evaluation, nextQuestion } = await session.submitAnswer(String(text ?? "").trim() || "(no answer given)");
      socket.emit("interview:evaluation", { index: answeredIndex, evaluation });
      if (nextQuestion !== null) {
        socket.emit("interview:question", {
          index: session.questionCount,
          total: TOTAL_QUESTIONS,
          text: nextQuestion,
        });
      } else {
        socket.emit("interview:complete", {
          overallScore: session.overallScore(),
          questions: session.records,
          config: session.config,
        });
        session = null;
      }
    } catch (err) {
      console.error("interview:answer failed:", err);
      socket.emit("interview:error", { message: errorMessage(err) });
    }
  });

  socket.on("disconnect", () => {
    session = null;
  });
});

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected server error.";
}

server.listen(PORT, () => {
  console.log(`InterviewOS server listening on http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn("⚠ GROQ_API_KEY is not set — interviews will fail until it is configured.");
  }
});
