"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { api, ApiError, Message } from "@/lib/api";

export default function ChatThreadPage() {
  return (
    <AuthGuard>
      <ChatThreadContent />
    </AuthGuard>
  );
}

function ChatThreadContent() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .listMessages(conversationId)
      .then(setMessages)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load messages"),
      );
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setError("");
    const text = input.trim();
    setInput("");
    try {
      const res = await api.sendMessage(conversationId, text);
      setMessages((prev) => [...prev, res.user_message, res.assistant_message]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send message");
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <Link href="/chat" className="mb-4 text-sm text-accent hover:underline">
          ← All conversations
        </Link>
        <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-panel p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-accent text-white"
                    : "border border-slate-700 bg-surface text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <div className="mt-3 border-t border-slate-700 pt-2">
                    <p className="text-xs font-medium text-muted">Sources</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted">
                      {m.sources.map((s, i) => (
                        <li key={i}>
                          {s.filename}
                          {s.chunk_index != null ? ` (chunk ${s.chunk_index})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {error && (
          <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        <form onSubmit={onSend} className="mt-4 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your documents..."
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-700 bg-panel px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            disabled={sending}
            className="self-end rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
