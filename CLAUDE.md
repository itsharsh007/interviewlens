# InterviewOS

Real-time AI mock interviewer: live webcam emotion analysis (face-api.js), voice in/out (Web Speech API), AI interviewer loop over Socket.io (Anthropic), and scored reports stored per-user in Firestore.

## Stack

- `/client` — React + Vite + TypeScript + Tailwind v4 + Framer Motion + Chart.js + socket.io-client + Firebase (auth + Firestore). face-api.js loaded from CDN.
- `/server` — Node + Express + TypeScript + Socket.io. All LLM calls go through a single `callLLM()` in `server/src/llm.ts`. Currently backed by **Groq** (OpenAI-compatible API via `fetch`), default model `llama-3.3-70b-versatile`; key in `GROQ_API_KEY`, model override via `GROQ_MODEL`. The provider is intentionally isolated to this one file so it can be swapped without touching the rest of the code.

## Operating principles

- Build and test incrementally — scaffold + auth first and confirm it runs, then add one feature area at a time, running the app and fixing all errors/warnings before continuing. Never consider something done with a failing build.
- Self-review against the spec before finishing: re-read it and confirm every feature exists; list done vs pending.
- Diagnose root causes, not symptoms; don't hide errors in empty try/catch.
- Don't invent APIs/packages; verify names, versions, and that imports resolve.
- Keep a running "Lessons" section in this file noting any mistake fixed so it isn't repeated.
- Commit per feature area with a clear message.
- Ask before destructive actions. If a requirement is ambiguous, ask rather than guess.
- Abstract the LLM call behind a single `callLLM()` function so the provider can be swapped without touching the rest of the code.

## Commands

- Client: `cd client && npm run dev` (Vite, port 5173), `npm run build` (typecheck + bundle)
- Server: `cd server && npm run dev` (tsx watch, port 3001), `npm run build` (tsc), `npm run typecheck`

## Lessons

- Vite 8 requires Node.js ≥20.19 or ≥22.12; the project was scaffolded with Node 20.17 — upgrade Node before running `npm run dev`.
