import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Chart, registerables } from "chart.js";
import type { InterviewReport } from "../types";
import { listReports, analyzeEmotions } from "../lib/reports";

Chart.register(...registerables);

function scoreColor(score: number): string {
  return score >= 7 ? "text-emerald-400" : score >= 4 ? "text-amber-400" : "text-rose-400";
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function ReportRow({ report }: { report: InterviewReport }) {
  const [open, setOpen] = useState(false);
  const emotion = analyzeEmotions(report.emotionTimeline ?? []);
  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            {report.config.type} · {report.config.difficulty} · {report.config.company}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(report.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-lg font-bold ${scoreColor(report.overallScore)}`}>
            {report.overallScore}/10
          </span>
          <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-base font-bold">{report.questions.length}</div>
              <div className="text-[11px] text-slate-400">Questions</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-base font-bold">{report.avgAnswerWords}</div>
              <div className="text-[11px] text-slate-400">Avg words</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-base font-bold">{report.fillerWordCount}</div>
              <div className="text-[11px] text-slate-400">Filler words</div>
            </div>
          </div>

          {/* Per-question scores */}
          <div className="space-y-1.5">
            {report.questions.map((q, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-slate-300 min-w-0 truncate">
                  Q{i + 1}: {q.question}
                </span>
                <span className={`font-semibold shrink-0 ${q.evaluation ? scoreColor(q.evaluation.score) : "text-slate-500"}`}>
                  {q.evaluation ? `${q.evaluation.score}/10` : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Emotional feedback */}
          {(emotion.strengths.length > 0 || emotion.improvements.length > 0) && (
            <div className="rounded-lg bg-white/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-400">Emotional feedback</p>
              {emotion.strengths.map((s, i) => (
                <p key={`s${i}`} className="text-xs text-slate-300">✓ {s}</p>
              ))}
              {emotion.improvements.map((g, i) => (
                <p key={`i${i}`} className="text-xs text-amber-300">→ {g}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Line chart of overall score across past interviews (oldest → newest). */
function ProgressChart({ reports }: { reports: InterviewReport[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // listReports returns newest-first; reverse for a left-to-right timeline.
    const ordered = [...reports].reverse();
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels: ordered.map((r) =>
          new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        ),
        datasets: [{
          label: "Overall score",
          data: ordered.map((r) => r.overallScore),
          borderColor: "rgb(129,140,248)",
          backgroundColor: "rgba(129,140,248,0.15)",
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: "rgb(129,140,248)",
          tension: 0.35,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#64748b" }, grid: { color: "#1e293b" } },
          y: { min: 0, max: 10, ticks: { color: "#64748b", stepSize: 2 }, grid: { color: "#1e293b" } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [reports]);

  const scores = reports.map((r) => r.overallScore);
  const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  const best = Math.max(...scores);
  // reports are newest-first, so trend = newest minus oldest.
  const trend = Math.round((scores[0] - scores[scores.length - 1]) * 10) / 10;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300">Your progress</h2>
        <div className="flex gap-4 text-xs">
          <span className="text-slate-400">Avg <span className="font-bold text-slate-100">{avg}</span></span>
          <span className="text-slate-400">Best <span className="font-bold text-emerald-400">{best}</span></span>
          <span className="text-slate-400">
            Trend{" "}
            <span className={`font-bold ${trend > 0 ? "text-emerald-400" : trend < 0 ? "text-rose-400" : "text-slate-200"}`}>
              {trend > 0 ? "▲" : trend < 0 ? "▼" : "–"} {Math.abs(trend)}
            </span>
          </span>
        </div>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
}

export function History({ uid, onBack }: { uid: string; onBack: () => void }) {
  const [reports, setReports] = useState<InterviewReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReports(uid)
      .then(setReports)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load history"));
  }, [uid]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-4 w-full space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Interview history</h1>
        <button onClick={onBack} className="btn-primary !py-2 !px-4 text-sm">New interview →</button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!reports && !error && <p className="text-slate-400 animate-pulse">Loading your past interviews…</p>}
      {reports && reports.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-slate-300 mb-2">No interviews yet.</p>
          <p className="text-sm text-slate-500">Complete your first mock interview and it'll show up here.</p>
        </div>
      )}
      {reports && reports.length >= 2 && <ProgressChart reports={reports} />}
      {reports && reports.length > 0 && (
        <div className="space-y-2">
          {reports.map((r) => <ReportRow key={r.id ?? r.createdAt} report={r} />)}
        </div>
      )}
    </motion.div>
  );
}
