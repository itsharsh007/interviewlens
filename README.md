<div align="center">

# 🎤 InterviewOS

**A real-time AI mock interviewer** — practice spoken interviews with an adaptive AI, live webcam emotion analysis, and detailed scored feedback.

[![Live Demo](https://img.shields.io/badge/Live_Demo-interviewlens.vercel.app-6366f1?style=for-the-badge)](https://interviewlens-phi.vercel.app)

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-realtime-010101?logo=socket.io&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-f55036)
![Firebase](https://img.shields.io/badge/Firebase-Auth_+_Firestore-ffca28?logo=firebase&logoColor=black)

</div>

> ⚠️ Open in **Chrome** and allow **camera + microphone**. The backend is on a free tier, so the first request after idle can take ~50s to wake up.

---

## 📸 Screenshots

<!-- Drop your images in docs/ with these names and they'll render here. -->
<div align="center">

| Live interview | Scored report |
|:--:|:--:|
| ![Interview screen](docs/interview.png) | ![Report screen](docs/report.png) |

</div>

---

## ✨ Features

- 🎙️ **Voice-driven interviews** — questions are spoken aloud (TTS) and your answers are transcribed live (speech-to-text). Fully hands-free.
- 🤖 **Adaptive AI interviewer** — a real-time loop over Socket.io asks one question at a time, scores each answer against a rubric, and adapts follow-ups. Pick **type** (SDE / Product / HR), **difficulty**, and **target company**; questions are randomized each run.
- 😀 **Live emotion analysis** — your webcam expressions are read in-browser with face-api.js and mapped to **Confident / Nervous / Focused / Distracted** in real time.
- 📊 **Detailed scored report** — overall score, per-question strengths & gaps, an emotion timeline chart, filler-word analytics, and **overall emotional feedback** (e.g. "work on projecting confidence").
- 🕘 **Interview history & progress** — every session is saved to your account; a progress chart tracks your score over time (with average, best, and trend) so you can see improvement across interviews.
- 🔐 **Accounts** — Firebase Auth (email/password + Google), with reports stored per user in Firestore.

## 🧰 Tech stack

| Layer | Technologies |
|-------|-------------|
| **Client** | React, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Chart.js, socket.io-client, Firebase |
| **Server** | Node, Express, TypeScript, Socket.io |
| **AI** | Groq (Llama 3.3 70B) behind a single, swappable `callLLM()` abstraction |
| **Vision / Voice** | face-api.js, Web Speech API |
| **Hosting** | Vercel (client) · Render (server) — auto-deploy on push to `main` |

## 🏗️ Architecture

```
┌─────────────────────────── Browser (React) ───────────────────────────┐
│  face-api.js → live emotion       Web Speech API → voice in / out      │
│  Firebase Auth + Firestore (accounts & saved reports)                  │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │  Socket.io (WebSocket)
                                 ▼
                    ┌────────────────────────────┐
                    │   Node + Express server     │
                    │   adaptive interview loop,  │ ──▶  Groq LLM
                    │   rubric scoring, next Qs   │      (Llama 3.3 70B)
                    └────────────────────────────┘
```

The LLM provider is isolated to `server/src/llm.ts`, so it can be swapped without touching the rest of the app.

## 🚀 Run locally

```bash
# 1. Configure environment (repo root)
cp .env.example .env        # fill in GROQ_API_KEY + VITE_FIREBASE_* values

# 2. Server  → http://localhost:3001
cd server && npm install && npm run dev

# 3. Client  → http://localhost:5173  (new terminal)
cd client && npm install && npm run dev
```

### Environment variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | server | Groq API key ([get one](https://console.groq.com/keys)) |
| `GROQ_MODEL` | server | *(optional)* model override, default `llama-3.3-70b-versatile` |
| `CLIENT_ORIGIN` | server | *(prod)* comma-separated allowed origins for CORS |
| `VITE_SERVER_URL` | client | URL of the deployed server (default `http://localhost:3001`) |
| `VITE_FIREBASE_*` | client | Firebase web config (6 values from the Firebase console) |

## 📦 Deployment

- **Server** → Render (Blueprint in [`render.yaml`](render.yaml)); set `GROQ_API_KEY` and `CLIENT_ORIGIN`.
- **Client** → Vercel with root directory `client`; set `VITE_SERVER_URL` + `VITE_FIREBASE_*`.

Both redeploy automatically on every push to `main`.

---

<div align="center">
Built with React, Node, Socket.io, and Groq.
</div>
