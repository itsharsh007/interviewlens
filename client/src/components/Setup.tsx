import { useState } from "react";
import { motion } from "framer-motion";
import type { Difficulty, InterviewConfig, InterviewType } from "../types";

const TYPES: { value: InterviewType; label: string; blurb: string }[] = [
  { value: "SDE", label: "SDE", blurb: "Algorithms, system design, coding practice" },
  { value: "Product", label: "Product", blurb: "Product sense, metrics, prioritization" },
  { value: "HR", label: "HR", blurb: "Behavioral, teamwork, culture fit" },
];

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

export function Setup({ onStart }: { onStart: (config: InterviewConfig) => void }) {
  const [type, setType] = useState<InterviewType>("SDE");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [company, setCompany] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="card p-8"
    >
      <h2 className="text-2xl font-bold mb-1">Configure your mock interview</h2>
      <p className="text-sm text-slate-400 mb-6">Tailor the session, then we'll run a live, spoken 5-question round.</p>

      <div className="mb-6">
        <p className="text-sm font-semibold text-slate-400 mb-2">Interview type</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-xl border p-4 text-left transition-all ${
                type === t.value
                  ? "border-indigo-400 bg-indigo-500/15 ring-1 ring-indigo-400/40"
                  : "border-white/10 hover:border-white/25 bg-white/5"
              }`}
            >
              <span className="font-semibold block">{t.label}</span>
              <span className="text-xs text-slate-400">{t.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm font-semibold text-slate-400 mb-2">Difficulty</p>
        <div className="flex gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`rounded-lg border px-5 py-2 transition-all ${
                difficulty === d
                  ? "border-indigo-400 bg-indigo-500/15 ring-1 ring-indigo-400/40"
                  : "border-white/10 hover:border-white/25 bg-white/5"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm font-semibold text-slate-400 mb-2">Target company</p>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Google, Stripe, a fintech startup…"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition"
        />
      </div>

      <button
        type="button"
        onClick={() => onStart({ type, difficulty, company: company.trim() || "a top tech company" })}
        className="btn-primary w-full"
      >
        Start interview →
      </button>
      <p className="text-xs text-slate-500 mt-3">
        You'll be asked for camera + microphone access. 5 questions, spoken aloud.
      </p>
    </motion.div>
  );
}
