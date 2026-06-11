import { useEffect, useRef, useState, type RefObject } from "react";
import type { EmotionLabel, EmotionSample } from "../types";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
const DETECT_INTERVAL_MS = 2000;

export type EmotionStatus = "loading" | "ready" | "error" | "unsupported";

/**
 * Map face-api's raw 7 expression scores onto the four interview-relevant
 * labels, then normalize so the four values sum to 1.
 */
export function mapExpressions(e: FaceApiExpressions): Record<EmotionLabel, number> {
  const raw = {
    Confident: e.happy + 0.4 * e.neutral,
    Nervous: e.fearful + 0.6 * e.sad + 0.3 * e.surprised,
    Focused: 0.6 * e.neutral,
    Distracted: 0.7 * e.surprised + 0.6 * e.angry + 0.5 * e.disgusted + 0.2 * e.sad,
  };
  const sum = raw.Confident + raw.Nervous + raw.Focused + raw.Distracted;
  if (sum <= 0) {
    return { Confident: 0.25, Nervous: 0.25, Focused: 0.25, Distracted: 0.25 };
  }
  return {
    Confident: raw.Confident / sum,
    Nervous: raw.Nervous / sum,
    Focused: raw.Focused / sum,
    Distracted: raw.Distracted / sum,
  };
}

function getFaceApi(): FaceApi | null {
  return typeof faceapi !== "undefined" && faceapi ? faceapi : null;
}

/**
 * Runs tinyFaceDetector + faceExpressionNet on `canvas` every 2 s while
 * `active`. Returns the latest sample plus the full timeline for the report.
 */
export function useEmotionDetection(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  active: boolean,
) {
  const [status, setStatus] = useState<EmotionStatus>("loading");
  const [current, setCurrent] = useState<EmotionSample | null>(null);
  const timelineRef = useRef<EmotionSample[]>([]);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    timelineRef.current = [];
    startTimeRef.current = Date.now();

    async function init() {
      // The CDN script is loaded with `defer`; wait briefly for it on slow connections.
      let api = getFaceApi();
      for (let i = 0; i < 20 && !api && !cancelled; i++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        api = getFaceApi();
      }
      if (cancelled) return;
      if (!api) {
        setStatus("unsupported");
        return;
      }
      try {
        await Promise.all([
          api.nets.tinyFaceDetector.isLoaded ? null : api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          api.nets.faceExpressionNet.isLoaded ? null : api.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
        if (!cancelled) setStatus("error");
        return;
      }
      if (cancelled) return;
      setStatus("ready");

      let busy = false;
      timer = setInterval(async () => {
        const canvas = canvasRef.current;
        if (!canvas || busy || cancelled || canvas.width === 0) return;
        busy = true;
        try {
          const detection = await api
            .detectSingleFace(canvas, new api.TinyFaceDetectorOptions({ inputSize: 224 }))
            .withFaceExpressions();
          if (cancelled) return;
          const t = Math.round((Date.now() - startTimeRef.current) / 1000);
          const sample: EmotionSample = detection
            ? { t, faceDetected: true, values: mapExpressions(detection.expressions) }
            : {
                t,
                faceDetected: false,
                values: { Confident: 0, Nervous: 0, Focused: 0, Distracted: 0 },
              };
          timelineRef.current.push(sample);
          setCurrent(sample);
        } catch (err) {
          console.error("Emotion detection tick failed:", err);
        } finally {
          busy = false;
        }
      }, DETECT_INTERVAL_MS);
    }

    void init();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [active, canvasRef]);

  return { status, current, timelineRef };
}
