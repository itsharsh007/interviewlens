import { callLLM, type LLMMessage } from "./llm.js";

export const TOTAL_QUESTIONS = 5;

export interface InterviewConfig {
  type: "SDE" | "Product" | "HR";
  difficulty: "Easy" | "Medium" | "Hard";
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

interface LLMTurn {
  evaluation?: Evaluation;
  next_question?: string;
}

const TYPE_LABEL: Record<InterviewConfig["type"], string> = {
  SDE: "software engineering (data structures, algorithms, system design, coding practices)",
  Product: "product management (product sense, metrics, prioritization, strategy)",
  HR: "behavioral / HR (motivation, teamwork, conflict resolution, culture fit)",
};

// Topic pools used to seed each session with a random focus, so questions vary
// run-to-run instead of always opening with the same one.
const TOPIC_POOLS: Record<InterviewConfig["type"], string[]> = {
  SDE: [
    "arrays & strings", "hash maps", "recursion & backtracking", "trees & graphs",
    "dynamic programming", "sorting & searching", "system design at scale",
    "API design", "concurrency", "databases & indexing", "caching", "time/space complexity",
  ],
  Product: [
    "designing a new feature", "improving a metric", "prioritization tradeoffs",
    "a product you admire", "go-to-market strategy", "handling a failing launch",
    "user segmentation", "pricing", "A/B testing & experimentation", "competitive analysis",
  ],
  HR: [
    "a time you led a team", "handling conflict", "a failure you learned from",
    "why this company", "working under pressure", "disagreeing with a manager",
    "your biggest strength & weakness", "going above and beyond", "ambiguity & change",
  ],
};

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function buildSystemPrompt(config: InterviewConfig, topics: string[]): string {
  return [
    `You are a fair, encouraging, and realistic interviewer for ${config.company}.`,
    `You are conducting a ${config.difficulty.toLowerCase()}-difficulty ${TYPE_LABEL[config.type]} interview.`,
    `Ask one question at a time; ask reasonable follow-ups based on the answer.`,
    `The interview is exactly ${TOTAL_QUESTIONS} questions long. Keep questions concise and speakable aloud (no code blocks, no markdown).`,
    `For THIS session, draw your questions primarily from these focus areas: ${topics.join(", ")}.`,
    `Vary the wording and angle so the interview feels fresh; do not reuse stock phrasings.`,
    ``,
    `Scoring rubric (score the SUBSTANCE of the answer, 1-10):`,
    `  9-10: excellent — correct, complete, well-structured, with depth or strong examples.`,
    `  7-8:  good — mostly correct and relevant, covers the key points, minor gaps.`,
    `  5-6:  fair — partially correct or on the right track but missing important pieces.`,
    `  3-4:  weak — vague, mostly off-target, or significant misunderstandings.`,
    `  1-2:  empty, irrelevant, or "I don't know".`,
    `Be generous with the benefit of the doubt. A solid, relevant answer should land at 7+.`,
    `The answer was transcribed from speech, so IGNORE grammar, punctuation, filler words,`,
    `and minor transcription errors — judge only the ideas and correctness.`,
    `Reserve scores below 5 for answers that are genuinely wrong, empty, or off-topic.`,
    `Always give at least one concrete strength when the answer has any merit.`,
    ``,
    `Respond ONLY with a single JSON object, no other text.`,
    `When asked for the first question, respond: {"next_question": "..."}`,
    `When given a candidate answer, respond:`,
    `{"evaluation": {"score": <integer 1-10>, "strengths": ["..."], "gaps": ["..."]}, "next_question": "..."}`,
    `If told it was the final answer, omit "next_question" and return only the evaluation.`,
  ].join("\n");
}

/** Extract the first JSON object from a model response, tolerating stray prose/fences. */
function parseLLMJson(raw: string): LLMTurn {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`LLM returned non-JSON output: ${raw.slice(0, 200)}`);
  }
  const parsed = JSON.parse(raw.slice(start, end + 1)) as LLMTurn;
  if (parsed.evaluation) {
    const e = parsed.evaluation;
    const parsedScore = Number(e.score);
    parsed.evaluation = {
      // Fall back to a neutral 5 (not 1) when the model omits or mangles the score.
      score: Math.min(10, Math.max(1, Math.round(Number.isFinite(parsedScore) ? parsedScore : 5))),
      strengths: Array.isArray(e.strengths) ? e.strengths.map(String) : [],
      gaps: Array.isArray(e.gaps) ? e.gaps.map(String) : [],
    };
  }
  return parsed;
}

export class InterviewSession {
  readonly config: InterviewConfig;
  readonly records: QuestionRecord[] = [];
  private readonly system: string;
  private readonly history: LLMMessage[] = [];

  constructor(config: InterviewConfig) {
    this.config = config;
    // Seed each session with a random subset of focus areas so questions vary run-to-run.
    const topics = pickRandom(TOPIC_POOLS[config.type], 4);
    this.system = buildSystemPrompt(config, topics);
  }

  get questionCount(): number {
    return this.records.length;
  }

  get isComplete(): boolean {
    return (
      this.records.length === TOTAL_QUESTIONS &&
      this.records[TOTAL_QUESTIONS - 1].evaluation !== null
    );
  }

  async firstQuestion(): Promise<string> {
    this.history.push({
      role: "user",
      content: "Begin the interview. Ask question 1.",
    });
    const raw = await callLLM(this.system, this.history);
    this.history.push({ role: "assistant", content: raw });
    const turn = parseLLMJson(raw);
    if (!turn.next_question) throw new Error("LLM did not return a first question.");
    this.records.push({ question: turn.next_question, answer: null, evaluation: null });
    return turn.next_question;
  }

  /**
   * Record the candidate's answer to the current question, evaluate it, and
   * (unless it was the final question) produce the next question.
   */
  async submitAnswer(answer: string): Promise<{ evaluation: Evaluation; nextQuestion: string | null }> {
    const current = this.records[this.records.length - 1];
    if (!current || current.answer !== null) {
      throw new Error("No pending question to answer.");
    }
    current.answer = answer;

    const isFinal = this.records.length === TOTAL_QUESTIONS;
    this.history.push({
      role: "user",
      content: isFinal
        ? `Candidate's answer to question ${this.records.length} (this was the FINAL question — return only the evaluation):\n${answer}`
        : `Candidate's answer to question ${this.records.length}:\n${answer}\nEvaluate it and ask question ${this.records.length + 1}.`,
    });
    const raw = await callLLM(this.system, this.history);
    this.history.push({ role: "assistant", content: raw });

    const turn = parseLLMJson(raw);
    if (!turn.evaluation) throw new Error("LLM did not return an evaluation.");
    current.evaluation = turn.evaluation;

    let nextQuestion: string | null = null;
    if (!isFinal) {
      if (!turn.next_question) throw new Error("LLM did not return the next question.");
      nextQuestion = turn.next_question;
      this.records.push({ question: nextQuestion, answer: null, evaluation: null });
    }
    return { evaluation: turn.evaluation, nextQuestion };
  }

  overallScore(): number {
    const scores = this.records
      .map((r) => r.evaluation?.score)
      .filter((s): s is number => typeof s === "number");
    if (scores.length === 0) return 0;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }
}
