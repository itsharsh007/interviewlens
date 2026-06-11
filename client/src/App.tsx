import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "./contexts/AuthContext";
import { Login } from "./components/Login";
import { Setup } from "./components/Setup";
import { Interview, type InterviewResult } from "./components/Interview";
import { Report } from "./components/Report";
import type { InterviewConfig } from "./types";

type Screen = "setup" | "interview" | "report";

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>("setup");
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [result, setResult] = useState<InterviewResult | null>(null);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-full">
        <Login />
      </div>
    );
  }

  function handleStart(cfg: InterviewConfig) {
    setConfig(cfg);
    setResult(null);
    setScreen("interview");
  }

  function handleComplete(r: InterviewResult) {
    setResult(r);
    setScreen("report");
  }

  function handleNewInterview() {
    setScreen("setup");
    setConfig(null);
    setResult(null);
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={handleNewInterview} className="text-xl font-bold hover:opacity-80 transition-opacity">
          Interview<span className="brand-accent">OS</span>
        </button>
        <button
          onClick={() => signOut().catch(() => {})}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 flex flex-col overflow-auto">
        <AnimatePresence mode="wait">
          {screen === "setup" && (
            <div key="setup" className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-2xl">
                <Setup onStart={handleStart} />
              </div>
            </div>
          )}
          {screen === "interview" && config && (
            <div key="interview" className="flex-1 flex flex-col py-4">
              <Interview
                config={config}
                onComplete={handleComplete}
                onAbort={handleNewInterview}
              />
            </div>
          )}
          {screen === "report" && result && (
            <div key="report" className="flex-1 overflow-auto py-4">
              <Report
                result={result}
                uid={user.uid}
                onNewInterview={handleNewInterview}
              />
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
