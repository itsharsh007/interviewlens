import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { EmotionSample, InterviewReport } from "../types";

const FILLER_WORDS = [
  "um", "uh", "er", "hmm", "like", "you know", "i mean", "actually",
  "basically", "literally", "kind of", "sort of", "you see", "right",
];

export function countFillerWords(answers: string[]): {
  total: number;
  breakdown: Record<string, number>;
} {
  const text = answers.join(" ").toLowerCase();
  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const filler of FILLER_WORDS) {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(`\\b${escaped}\\b`, "g"));
    if (matches && matches.length > 0) {
      breakdown[filler] = matches.length;
      total += matches.length;
    }
  }
  return { total, breakdown };
}

export function averageAnswerWords(answers: string[]): number {
  if (answers.length === 0) return 0;
  const totalWords = answers.reduce(
    (sum, a) => sum + a.split(/\s+/).filter(Boolean).length,
    0,
  );
  return Math.round(totalWords / answers.length);
}

/** Cap the timeline so the Firestore document stays well under the 1 MiB limit. */
export function downsampleTimeline(timeline: EmotionSample[], maxPoints = 300): EmotionSample[] {
  if (timeline.length <= maxPoints) return timeline;
  const step = timeline.length / maxPoints;
  const out: EmotionSample[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(timeline[Math.floor(i * step)]);
  }
  return out;
}

export async function saveReport(uid: string, report: InterviewReport): Promise<string> {
  const ref = await addDoc(collection(getDb(), "users", uid, "reports"), {
    ...report,
    emotionTimeline: downsampleTimeline(report.emotionTimeline),
    savedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listReports(uid: string): Promise<InterviewReport[]> {
  const q = query(collection(getDb(), "users", uid, "reports"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ ...(doc.data() as InterviewReport), id: doc.id }));
}
