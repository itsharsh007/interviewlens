export function AudioLevelBar({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <span
        className={`h-2.5 w-2.5 rounded-full ${active ? "bg-rose-500 animate-pulse" : "bg-slate-600"}`}
        title={active ? "Mic live" : "Mic idle"}
      />
      <span className="text-xs font-medium text-slate-400 w-16">
        {active ? "Listening" : "Mic idle"}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-[width] duration-75"
          style={{ width: `${Math.round((active ? level : 0) * 100)}%` }}
        />
      </div>
    </div>
  );
}
