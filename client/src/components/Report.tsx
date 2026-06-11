import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Chart, registerables } from "chart.js";
import type { InterviewReport, QuestionRecord } from "../types";
import { countFillerWords, averageAnswerWords, saveReport, analyzeEmotions } from "../lib/reports";
import { EMOTION_LABELS } from "../types";
import type { InterviewResult } from "./Interview";

Chart.register(...registerables);

const EMOTION_COLORS: Record<string, string> = {
  Confident: "rgb(52,211,153)",
  Nervous: "rgb(251,113,133)",
  Focused: "rgb(56,189,248)",
  Distracted: "rgb(251,191,36)",
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 7 ? "bg-emerald-400" : score >= 4 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${score >= 7 ? "text-emerald-400" : score >= 4 ? "text-amber-400" : "text-rose-400"}`}>
        {score}/10
      </span>
    </div>
  );
}

function QuestionCard({ record, index }: { record: QuestionRecord; index: number }) {
  const [open, setOpen] = useState(false);
  const e = record.evaluation;
  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-semibold">Q{index + 1}: {record.question.slice(0, 80)}{record.question.length > 80 ? "…" : ""}</span>
        <span className="text-xs text-slate-400">{e ? `${e.score}/10` : "—"} {open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-800 pt-4">
          <p className="text-sm text-slate-300 leading-relaxed">{record.question}</p>
          {record.answer && (
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-xs text-slate-500 mb-1">Your answer</p>
              <p className="text-sm text-slate-200 leading-relaxed">{record.answer}</p>
            </div>
          )}
          {e && (
            <>
              <ScoreBar score={e.score} />
              {e.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-400 mb-1">Strengths</p>
                  <ul className="space-y-1">
                    {e.strengths.map((s, i) => <li key={i} className="text-sm text-slate-300">✓ {s}</li>)}
                  </ul>
                </div>
              )}
              {e.gaps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-rose-400 mb-1">Areas to improve</p>
                  <ul className="space-y-1">
                    {e.gaps.map((g, i) => <li key={i} className="text-sm text-slate-300">✗ {g}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Report({
  result,
  uid,
  onNewInterview,
}: {
  result: InterviewResult;
  uid: string;
  onNewInterview: () => void;
}) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const answers = result.questions.map((q) => q.answer ?? "");
  const { total: fillerTotal, breakdown: fillerBreakdown } = countFillerWords(answers);
  const avgWords = averageAnswerWords(answers);
  const emotion = analyzeEmotions(result.emotionTimeline);

  // Build and save full report once.
  useEffect(() => {
    const report: InterviewReport = {
      createdAt: Date.now(),
      config: result.config,
      overallScore: result.overallScore,
      questions: result.questions,
      emotionTimeline: result.emotionTimeline,
      fillerWordCount: fillerTotal,
      fillerWordBreakdown: fillerBreakdown,
      avgAnswerWords: avgWords,
    };
    saveReport(uid, report)
      .then(() => setSaved(true))
      .catch((err: unknown) => setSaveError(err instanceof Error ? err.message : "Save failed"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emotion timeline chart.
  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas || result.emotionTimeline.length === 0) return;
    chartInstance.current?.destroy();

    const labels = result.emotionTimeline.map((s) => `${s.t}s`);
    const emotions = ["Confident", "Nervous", "Focused", "Distracted"] as const;

    chartInstance.current = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: emotions.map((label) => ({
          label,
          data: result.emotionTimeline.map((s) => Math.round(s.values[label] * 100)),
          borderColor: EMOTION_COLORS[label],
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
        })),
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#94a3b8", boxWidth: 12, font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: "#475569", maxTicksLimit: 8 }, grid: { color: "#1e293b" } },
          y: { min: 0, max: 100, ticks: { color: "#475569", callback: (v) => `${v}%` }, grid: { color: "#1e293b" } },
        },
      },
    });
    return () => { chartInstance.current?.destroy(); };
  }, [result.emotionTimeline]);

  const score = result.overallScore;
  const scoreColor = score >= 7 ? "text-emerald-400" : score >= 4 ? "text-amber-400" : "text-rose-400";
  const verdict =
    score >= 8.5 ? "Outstanding — you're interview-ready" :
    score >= 7 ? "Strong performance" :
    score >= 5.5 ? "Solid, with room to sharpen" :
    score >= 4 ? "Promising — keep practicing" :
    "Early days — let's build those reps";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-4 w-full space-y-6"
    >
      {/* Header */}
      <div className="card p-8 text-center">
        <h1 className="text-3xl font-bold mb-1">
          Interview<span className="brand-accent">OS</span>
        </h1>
        <p className="text-slate-400 mb-6">
          {result.config.type} · {result.config.difficulty} · {result.config.company}
        </p>
        <div className={`text-7xl font-black mb-2 ${scoreColor}`}>{score}<span className="text-3xl text-slate-500 font-bold">/10</span></div>
        <p className={`text-sm font-semibold ${scoreColor}`}>{verdict}</p>
        {saved && <p className="text-xs text-emerald-400 mt-3">✓ Report saved to your history</p>}
        {saveError && <p className="text-xs text-rose-400 mt-3">Save failed: {saveError}</p>}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Questions answered", value: result.questions.length },
          { label: "Avg answer length", value: `${avgWords} words` },
          { label: "Filler words", value: fillerTotal },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filler breakdown */}
      {Object.keys(fillerBreakdown).length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3 text-slate-300">Filler word breakdown</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(fillerBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([word, count]) => (
                <span key={word} className="rounded-full border border-slate-700 px-3 py-1 text-xs">
                  "{word}" × {count}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Emotion chart */}
      {result.emotionTimeline.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4 text-slate-300">Emotion timeline</h2>
          <canvas ref={chartRef} />
        </div>
      )}

      {/* Overall emotional feedback */}
      {result.emotionTimeline.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-1 text-slate-300">Overall emotional feedback</h2>
          <p className="text-xs text-slate-500 mb-4">Read from your on-camera demeanor across the whole interview.</p>

          {/* Average emotion mix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {EMOTION_LABELS.map((label) => (
              <div key={label} className="rounded-lg bg-white/5 p-3 text-center">
                <div className="text-xl font-bold" style={{ color: EMOTION_COLORS[label] }}>
                  {Math.round(emotion.averages[label] * 100)}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {emotion.strengths.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-emerald-400 mb-1">What came across well</p>
              <ul className="space-y-1">
                {emotion.strengths.map((s, i) => <li key={i} className="text-sm text-slate-300">✓ {s}</li>)}
              </ul>
            </div>
          )}
          {emotion.improvements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1">Areas to improve</p>
              <ul className="space-y-1">
                {emotion.improvements.map((g, i) => <li key={i} className="text-sm text-slate-300">→ {g}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Per-question breakdown */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-slate-300">Question breakdown</h2>
        <div className="space-y-2">
          {result.questions.map((q, i) => (
            <QuestionCard key={i} record={q} index={i} />
          ))}
        </div>
      </div>

      <button
        onClick={onNewInterview}
        className="btn-primary w-full"
      >
        Start another interview
      </button>
    </motion.div>
  );
}
