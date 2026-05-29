"use client";

import { useEffect, useState } from "react";

const STORED_KEY_NAME = "geminiApiKey";

// BYOK gate. The visitor's key gates Connect, persists in localStorage
// (paste-once), and is handed to the session, which sends it as the first
// WebSocket frame. It never leaves the browser except to start the session.
export function ApiKeyGate({
  onConnect,
}: {
  onConnect: (apiKey: string) => void;
}) {
  const [apiKey, setApiKey] = useState("");

  // Hydrate the saved key from localStorage on mount. This is a deliberate
  // client-only read of an external store after a static-export prerender (the
  // server has no localStorage), which is exactly the "subscribe to external
  // state" case the set-state-in-effect rule warns about but doesn't fit here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(localStorage.getItem(STORED_KEY_NAME) || "");
  }, []);

  const update = (value: string) => {
    setApiKey(value);
    localStorage.setItem(STORED_KEY_NAME, value.trim());
  };

  const trimmed = apiKey.trim();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="rounded-xl bg-slate-50 p-5 text-left ring-1 ring-slate-100">
        <h3 className="text-base font-semibold">Features enabled</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>
            <strong className="text-slate-900">Native audio:</strong> low
            latency voice interaction
          </li>
          <li>
            <strong className="text-slate-900">Persistent memory:</strong> the
            AI remembers what it sees and hears across sessions
          </li>
        </ul>
        <p className="mt-4 text-sm italic text-slate-500">
          When you connect, the app asks Gemini to introduce itself and these
          features.
        </p>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label htmlFor="apiKeyInput" className="text-sm font-semibold">
          Your Gemini API key
        </label>
        <input
          id="apiKeyInput"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste your Gemini API key"
          value={apiKey}
          onChange={(e) => update(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed) onConnect(trimmed);
          }}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <p className="text-xs text-slate-500">
          Your key stays in your browser and is sent only to start your session
          — it is never logged or stored on our server. Get one at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener"
            className="text-blue-600 underline"
          >
            aistudio.google.com/apikey
          </a>
          . Note: the key must have Gemini Live access.
        </p>
      </div>

      <button
        type="button"
        disabled={!trimmed}
        onClick={() => onConnect(trimmed)}
        className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Connect
      </button>
    </div>
  );
}
