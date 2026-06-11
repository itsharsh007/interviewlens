import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, type Socket } from "socket.io-client";
import type { InterviewConfig, Evaluation, QuestionRecord, EmotionSample } from "../types";
import { useEmotionDetection } from "../hooks/useEmotionDetection";
import { useSpeechSynthesis, useSpeechRecognition } from "../hooks/useSpeech";
import { useAudioLevel } from "../hooks/useAudioLevel";
import { AudioLevelBar } from "./AudioLevelBar";
import { EmotionBars } from "./EmotionBars";

const SERVER_URL = import.meta.env.VITE_SERVER_URL as string ?? "http://localhost:3001";

type Phase = "connecting" | "question" | "answering" | "evaluating" | "done" | "error";

interface InterviewState {
  phase: Phase;
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  lastEvaluation: Evaluation | null;
  questions: QuestionRecord[];
  overallScore: number;
  errorMsg: string;
}

export interface InterviewResult {
  overallScore: number;
  questions: QuestionRecord[];
  emotionTimeline: EmotionSample[];
  config: InterviewConfig;
}

const INITIAL: InterviewState = {
  phase: "connecting",
  questionIndex: 0,
  totalQuestions: 5,
  questionText: "",
  lastEvaluation: null,
  questions: [],
  overallScore: 0,
  errorMsg: "",
};

export function Interview({
  config,
  onComplete,
  onAbort,
}: {
  config: InterviewConfig;
  onComplete: (result: InterviewResult) => void;
  onAbort: () => void;
}) {
  const [state, setState] = useState<InterviewState>(INITIAL);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { status: emotionStatus, current: emotionSample, timelineRef } = useEmotionDetection(
    canvasRef,
    state.phase !== "connecting" && state.phase !== "done" && state.phase !== "error",
  );
  const tts = useSpeechSynthesis();
  const stt = useSpeechRecognition();
  const audioLevel = useAudioLevel(
    streamRef.current,
    state.phase === "answering",
  );

  // Mirror video frames to canvas for face-api.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    let frame = 0;
    const draw = () => {
      if (video.readyState >= 2 && canvas.width > 0) {
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Start webcam & socket.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, phase: "error", errorMsg: "Camera/mic access denied. Allow permissions and try again." }));
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const socket = io(SERVER_URL, { transports: ["websocket", "polling"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("interview:start", config);
      });

      socket.on("interview:question", ({ index, total, text }: { index: number; total: number; text: string }) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          phase: "question",
          questionIndex: index,
          totalQuestions: total,
          questionText: text,
          lastEvaluation: null,
        }));
      });

      socket.on("interview:evaluation", ({ evaluation }: { evaluation: Evaluation }) => {
        if (cancelled) return;
        setState((s) => ({ ...s, lastEvaluation: evaluation }));
      });

      socket.on("interview:complete", ({ overallScore, questions, config: cfg }: { overallScore: number; questions: QuestionRecord[]; config: InterviewConfig }) => {
        if (cancelled) return;
        setState((s) => ({ ...s, phase: "done", overallScore, questions }));
        onComplete({
          overallScore,
          questions,
          config: cfg,
          emotionTimeline: timelineRef.current,
        });
      });

      socket.on("interview:error", ({ message }: { message: string }) => {
        if (cancelled) return;
        setState((s) => ({ ...s, phase: "error", errorMsg: message }));
      });

      socket.on("connect_error", () => {
        if (!cancelled) setState((s) => ({ ...s, phase: "error", errorMsg: "Cannot connect to server. Is it running?" }));
      });
    }

    void boot();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      tts.cancel();
      stt.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speak each new question aloud.
  useEffect(() => {
    if (state.phase !== "question" || !state.questionText) return;
    tts.speak(state.questionText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionText, state.phase]);

  const submitAnswer = useCallback(() => {
    const answer = (stt.transcript + " " + stt.interim).trim();
    stt.stop();
    if (!answer) return;
    setState((s) => ({ ...s, phase: "evaluating" }));
    socketRef.current?.emit("interview:answer", { text: answer });
  }, [stt]);

  const startListening = useCallback(() => {
    tts.cancel();
    stt.start();
    setState((s) => ({ ...s, phase: "answering" }));
  }, [tts, stt]);

  if (state.phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-6 p-8">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
          <p className="text-lg font-semibold text-rose-300 mb-4">{state.errorMsg}</p>
          <button
            onClick={onAbort}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 px-6 py-2.5 font-semibold transition-colors"
          >
            Back to setup
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-slate-400 animate-pulse">Generating report…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">
          Interview<span className="brand-accent">OS</span>
          <span className="text-sm font-normal text-slate-400 ml-3">
            {config.type} · {config.difficulty} · {config.company}
          </span>
        </h1>
        {state.phase !== "connecting" && (
          <span className="text-sm text-slate-400">
            Q {state.questionIndex}/{state.totalQuestions}
          </span>
        )}
        <button
          onClick={() => { tts.cancel(); onAbort(); }}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          End interview
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Webcam panel */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              const canvas = canvasRef.current;
              if (canvas) {
                canvas.width = v.videoWidth;
                canvas.height = v.videoHeight;
              }
            }}
          />
          <canvas ref={canvasRef} className="hidden" />
          <EmotionBars sample={emotionSample} status={emotionStatus} />
        </div>

        {/* Interview panel */}
        <div className="flex flex-col gap-3">
          {state.phase === "connecting" && (
            <div className="flex-1 flex items-center justify-center card p-8">
              <p className="text-slate-400 animate-pulse">Connecting…</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {state.phase !== "connecting" && (
              <motion.div
                key={state.questionIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="card p-5"
              >
                <p className="text-xs font-semibold text-indigo-400 mb-2">
                  Question {state.questionIndex} of {state.totalQuestions}
                </p>
                <p className="text-base leading-relaxed">{state.questionText}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Last evaluation */}
          <AnimatePresence>
            {state.lastEvaluation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-400">Previous score</span>
                  <span className={`text-sm font-bold ${state.lastEvaluation.score >= 7 ? "text-emerald-400" : state.lastEvaluation.score >= 4 ? "text-amber-400" : "text-rose-400"}`}>
                    {state.lastEvaluation.score}/10
                  </span>
                </div>
                {state.lastEvaluation.strengths.length > 0 && (
                  <p className="text-xs text-slate-300">✓ {state.lastEvaluation.strengths[0]}</p>
                )}
                {state.lastEvaluation.gaps.length > 0 && (
                  <p className="text-xs text-rose-300 mt-1">✗ {state.lastEvaluation.gaps[0]}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* STT transcript */}
          {(state.phase === "answering") && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 min-h-[72px]">
              <p className="text-sm text-slate-200">
                {stt.transcript}
                {stt.interim && <span className="text-slate-500"> {stt.interim}</span>}
                {!stt.transcript && !stt.interim && (
                  <span className="text-slate-500 italic">Listening… speak your answer</span>
                )}
              </p>
            </div>
          )}
          {stt.error && <p className="text-xs text-rose-400">{stt.error}</p>}

          <AudioLevelBar level={audioLevel} active={state.phase === "answering"} />

          {/* Action buttons */}
          <div className="flex gap-3">
            {state.phase === "question" && (
              <button
                onClick={startListening}
                className="btn-primary flex-1"
              >
                🎙 Answer →
              </button>
            )}
            {state.phase === "answering" && (
              <button
                onClick={submitAnswer}
                disabled={!stt.transcript && !stt.interim}
                className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-3 font-semibold transition-colors"
              >
                Submit answer
              </button>
            )}
            {state.phase === "evaluating" && (
              <div className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-center text-slate-400 animate-pulse">
                Evaluating…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
