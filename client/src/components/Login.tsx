import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "That email is already registered — sign in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    default:
      return err instanceof Error ? err.message : "Sign-in failed. Try again.";
  }
}

export function Login() {
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8">
          <h1 className="text-2xl font-bold mb-3">Firebase isn't configured yet</h1>
          <p className="text-slate-300 mb-4">
            Copy <code className="text-amber-300">.env.example</code> to{" "}
            <code className="text-amber-300">.env</code> in the repo root and fill in the{" "}
            <code className="text-amber-300">VITE_FIREBASE_*</code> values from your Firebase
            project, then restart the dev server. Setup steps are in the README.
          </p>
        </div>
      </div>
    );
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(() => (mode === "signin" ? signInEmail(email, password) : signUpEmail(email, password)));
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md card p-8"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Interview<span className="brand-accent">OS</span>
        </h1>
        <p className="text-slate-400 mt-1 mb-6">
          AI mock interviews with live emotion analysis.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition"
          />
          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full !py-2.5"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-slate-500">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void run(signInGoogle)}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50 px-4 py-2.5 font-semibold transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"/>
            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"/>
          </svg>
          Continue with Google
        </button>

        {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

        <p className="mt-6 text-sm text-slate-400">
          {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-indigo-400 hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
