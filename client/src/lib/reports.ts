import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { EMOTION_LABELS, type EmotionLabel, type EmotionSample, type InterviewReport } from "../types";

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

export interface EmotionFeedback {
  faceDetectedRatio: number; // 0..1 — share of samples where a face was found
  averages: Record<EmotionLabel, number>; // 0..1 each, over detected samples
  strengths: string[];
  improvements: string[];
}

/**
 * Aggregate the per-second emotion samples into a single overall read of the
 * candidate's demeanor, with plain-language strengths and areas to improve
 * (e.g. "lack of confidence", "visible nervousness").
 */
export function analyzeEmotions(timeline: EmotionSample[]): EmotionFeedback {
  const detected = timeline.filter((s) => s.faceDetected);
  const faceDetectedRatio = timeline.length ? detected.length / timeline.length : 0;

  const averages: Record<EmotionLabel, number> = {
    Confident: 0, Nervous: 0, Focused: 0, Distracted: 0,
  };
  for (const s of detected) {
    for (const label of EMOTION_LABELS) averages[label] += s.values[label];
  }
  if (detected.length) {
    for (const label of EMOTION_LABELS) averages[label] /= detected.length;
  }

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (detected.length === 0) {
    improvements.push(
      "No face was detected during the interview — sit centered in a well-lit frame so your delivery can be analyzed.",
    );
    return { faceDetectedRatio, averages, strengths, improvements };
  }

  // Strengths
  if (averages.Confident >= 0.3) strengths.push("Projected steady confidence throughout.");
  if (averages.Focused >= 0.28) strengths.push("Stayed focused and engaged with the questions.");
  if (averages.Nervous < 0.22 && averages.Distracted < 0.25) {
    strengths.push("Kept a calm, composed presence on camera.");
  }

  // Areas to improve
  if (averages.Confident < 0.24) {
    improvements.push("Work on projecting more confidence — sit upright, steady your voice, and hold eye contact with the camera.");
  }
  if (averages.Nervous >= 0.28) {
    improvements.push("Visible nervousness — pause and take a breath before answering to come across calmer.");
  }
  if (averages.Distracted >= 0.28) {
    improvements.push("You often looked distracted — keep your gaze toward the camera to read as attentive.");
  }
  if (faceDetectedRatio < 0.6) {
    improvements.push(`Your face was only detected ${Math.round(faceDetectedRatio * 100)}% of the time — stay centered in frame for the full interview.`);
  }

  if (strengths.length === 0) strengths.push("You showed up and completed the full interview — a solid baseline to build on.");
  if (improvements.length === 0) improvements.push("Great emotional composure overall — keep it up.");

  return { faceDetectedRatio, averages, strengths, improvements };
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
