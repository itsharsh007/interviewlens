import { useCallback, useEffect, useRef, useState } from "react";

/** Text-to-speech for the AI interviewer's questions. */
export function useSpeechSynthesis() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!supported) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onstart = () => setSpeaking(true);
      const finish = () => {
        setSpeaking(false);
        onEnd?.();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  useEffect(() => cancel, [cancel]);

  return { supported, speaking, speak, cancel };
}

/** Speech-to-text for the candidate's spoken answers. */
export function useSpeechRecognition() {
  const RecognitionCtor =
    typeof window !== "undefined"
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined;
  const supported = Boolean(RecognitionCtor);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Recognition can end on its own (silence); restart while the user is still answering.
  const shouldListenRef = useRef(false);

  const start = useCallback(() => {
    if (!RecognitionCtor || recognitionRef.current) return;
    setError(null);
    setTranscript("");
    setInterim("");
    shouldListenRef.current = true;

    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText) setTranscript((prev) => (prev + " " + finalText).trim());
      setInterim(interimText);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access denied — allow mic access to answer by voice.");
        shouldListenRef.current = false;
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}`);
      }
    };
    recognition.onend = () => {
      if (shouldListenRef.current) {
        // Browser stopped on silence — keep capturing until the user submits.
        try {
          recognition.start();
          return;
        } catch {
          // fall through to cleanup if restart is rejected
        }
      }
      recognitionRef.current = null;
      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }, [RecognitionCtor]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, setTranscript };
}
