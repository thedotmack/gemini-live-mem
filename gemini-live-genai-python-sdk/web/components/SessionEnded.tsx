export function SessionEnded({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200 animate-pop-in">
      <h2 className="text-2xl font-semibold">Session Ended</h2>
      <button
        type="button"
        onClick={onRestart}
        className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        Start New Session
      </button>
    </div>
  );
}
