# InterviewOS

**Real-time AI mock interviewer** — live webcam emotion analysis, voice-driven Q&A, an adaptive AI interviewer over WebSockets, and scored feedback reports saved per user.

### 🔗 Live demo: **[interviewlens-phi.vercel.app](https://interviewlens-phi.vercel.app)**

> Use Chrome and allow camera + microphone access. The backend runs on a free tier, so the first request after idle may take ~50s to wake.

---

## Features

- 🎙️ **Voice-driven interviews** — questions are spoken aloud (TTS) and answers are captured by speech-to-text (Web Speech API); fully hands-free.
- 🤖 **Adaptive AI interviewer** — a real-time loop over Socket.io asks one question at a time, evaluates each answer against a rubric, and adapts follow-ups. Choose type (SDE / Product / HR), difficulty, and target company.
- 😀 **Live emotion analysis** — webcam expressions are read in-browser with face-api.js and mapped to Confident / Nervous / Focused / Distracted in real time.
- 📊 **Scored reports** — per-question scores, strengths & gaps, an emotion timeline, and filler-word analytics, all visualized with Chart.js.
- 🔐 **Accounts & history** — Firebase Auth (email/password + Google) with each user's reports persisted in Firestore.

## Tech stack

| Layer | Tech |
|-------|------|
| Client | React, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Chart.js, socket.io-client, Firebase |
| Server | Node, Express, TypeScript, Socket.io |
| AI | Groq (Llama 3.3 70B) behind a single swappable `callLLM()` abstraction |
| Vision / Voice | face-api.js, Web Speech API |
| Hosting | Vercel (client) · Render (server) — auto-deploy on push to `main` |

## Architecture

```
Browser (React)  ──Socket.io──▶  Node server  ──▶  Groq LLM
  ├─ face-api.js (emotion)         (interview loop,
  ├─ Web Speech (voice I/O)         scoring, adaptive Qs)
  └─ Firebase (auth + Firestore reports)
```

The LLM provider is isolated to `server/src/llm.ts` so it can be swapped without touching the rest of the app.

## Run locally

```bash
# 1. Configure environment
cp .env.example .env        # then fill in GROQ_API_KEY + VITE_FIREBASE_* values

# 2. Server  → http://localhost:3001
cd server && npm install && npm run dev

# 3. Client  → http://localhost:5173
cd client && npm install && npm run dev
```

See `.env.example` for all required variables (Groq key, Firebase web config, and optional `VITE_SERVER_URL` / `CLIENT_ORIGIN` for deployment).
