"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatItem } from "@/hooks/useGeminiSession";

function InvitationCard({
  item,
}: {
  item: Extract<ChatItem, { kind: "invitation" }>;
}) {
  const { details } = item;
  const line =
    [
      details.title,
      [details.date, details.time].filter(Boolean).join(" "),
      details.location,
    ]
      .filter(Boolean)
      .join(" • ") || "You're invited!";

  return (
    <div className="flex max-w-[92%] flex-col items-center gap-2 self-center rounded-xl border border-purple-200 bg-gradient-to-br from-orange-50 to-purple-50 p-1.5 shadow-lg animate-pop-in">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:${item.mimeType};base64,${item.imageBase64}`}
        alt={details.title || "Event invitation"}
        className="block w-full max-w-sm rounded-lg"
      />
      <div className="px-1 pb-1 text-center text-sm font-semibold text-slate-700">
        {line}
      </div>
    </div>
  );
}

export function ChatPanel({ chat }: { chat: ChatItem[] }) {
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  return (
    <div
      ref={logRef}
      className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200"
    >
      {chat.map((item) => {
        if (item.kind === "invitation") {
          return <InvitationCard key={item.id} item={item} />;
        }
        if (item.kind === "user") {
          return (
            <div
              key={item.id}
              className="max-w-[80%] self-end rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2 text-white"
            >
              {item.text}
            </div>
          );
        }
        return (
          <div
            key={item.id}
            className="markdown max-w-[80%] self-start break-words rounded-2xl rounded-bl-sm bg-slate-200 px-4 py-2 text-slate-900"
          >
            <ReactMarkdown>{item.text}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
