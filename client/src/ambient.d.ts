// ---- Web Speech API (not in lib.dom for all targets) ----
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

// ---- face-api.js (loaded from CDN in index.html) ----
interface FaceApiExpressions {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

interface FaceApiDetectionWithExpressions {
  expressions: FaceApiExpressions;
}

interface FaceApiNet {
  loadFromUri(uri: string): Promise<void>;
  isLoaded: boolean;
}

interface FaceApiDetectTask {
  withFaceExpressions(): Promise<FaceApiDetectionWithExpressions | undefined>;
}

interface FaceApi {
  nets: {
    tinyFaceDetector: FaceApiNet;
    faceExpressionNet: FaceApiNet;
  };
  TinyFaceDetectorOptions: new (opts?: { inputSize?: number; scoreThreshold?: number }) => object;
  detectSingleFace(
    input: HTMLCanvasElement | HTMLVideoElement,
    options?: object,
  ): FaceApiDetectTask;
}

declare const faceapi: FaceApi | undefined;
