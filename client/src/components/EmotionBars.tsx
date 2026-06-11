import { motion } from "framer-motion";
import { EMOTION_LABELS, type EmotionSample } from "../types";
import type { EmotionStatus } from "../hooks/useEmotionDetection";

const BAR_COLORS: Record<string, string> = {
  Confident: "bg-emerald-400",
  Nervous: "bg-rose-400",
  Focused: "bg-sky-400",
  Distracted: "bg-amber-400",
};

export function EmotionBars({
  sample,
  status,
}: {
  sample: EmotionSample | null;
  status: EmotionStatus;
}) {
  return (
    <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-slate-950/70 backdrop-blur px-4 py-3">
      {status === "loading" && (
        <p className="text-xs text-slate-300 animate-pulse">Loading emotion models…</p>
      )}
      {status === "error" && (
        <p className="text-xs text-rose-300">Emotion models failed to load — check your connection.</p>
      )}
      {status === "unsupported" && (
        <p className="text-xs text-rose-300">face-api.js failed to load from CDN.</p>
      )}
      {status === "ready" && sample && !sample.faceDetected && (
        <p className="text-xs text-amber-300">No face detected — center yourself in frame.</p>
      )}
      {status === "ready" && (!sample || sample.faceDetected) && (
        <div className="space-y-1.5">
          {EMOTION_LABELS.map((label) => {
            const value = sample?.values[label] ?? 0;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="w-20 text-[11px] font-medium text-slate-200">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-700/60 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${BAR_COLORS[label]}`}
                    animate={{ width: `${Math.round(value * 100)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <span className="w-9 text-right text-[11px] tabular-nums text-slate-300">
                  {Math.round(value * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
