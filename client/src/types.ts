export type InterviewType = "SDE" | "Product" | "HR";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface InterviewConfig {
  type: InterviewType;
  difficulty: Difficulty;
  company: string;
}

export interface Evaluation {
  score: number; // 1-10
  strengths: string[];
  gaps: string[];
}

export interface QuestionRecord {
  question: string;
  answer: string | null;
  evaluation: Evaluation | null;
}

export const EMOTION_LABELS = ["Confident", "Nervous", "Focused", "Distracted"] as const;
export type EmotionLabel = (typeof EMOTION_LABELS)[number];

export interface EmotionSample {
  /** seconds since interview start */
  t: number;
  faceDetected: boolean;
  values: Record<EmotionLabel, number>; // each 0..1, normalized to sum to 1 when a face is detected
}

export interface InterviewReport {
  id?: string;
  createdAt: number; // epoch ms (set client-side; Firestore also stores a server timestamp)
  config: InterviewConfig;
  overallScore: number;
  questions: QuestionRecord[];
  emotionTimeline: EmotionSample[];
  fillerWordCount: number;
  fillerWordBreakdown: Record<string, number>;
  avgAnswerWords: number;
}
