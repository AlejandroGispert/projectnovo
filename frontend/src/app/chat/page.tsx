"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { api, ApiError, Conversation } from "@/lib/api";

export default function ChatListPage() {
  return (
    <AuthGuard>
      <ChatListContent />
    </AuthGuard>
  );
}

function ChatListContent() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .listConversations()
      .then(setConversations)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load conversations"),
      );
  }, []);

  async function newChat() {
    setCreating(true);
    try {
      const conv = await api.createConversation();
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create chat");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Conversations</h1>
          <button
            type="button"
            onClick={newChat}
            disabled={creating}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {creating ? "Creating..." : "New chat"}
          </button>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        <ul className="mt-6 space-y-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className="block rounded-xl border border-slate-800 bg-panel px-4 py-3 hover:border-slate-600"
              >
                <p className="font-medium text-white">{c.title}</p>
                {c.last_message_preview && (
                  <p className="mt-1 truncate text-sm text-muted">{c.last_message_preview}</p>
                )}
              </Link>
            </li>
          ))}
          {conversations.length === 0 && (
            <li className="rounded-xl border border-slate-800 bg-panel p-6 text-center text-muted">
              No conversations yet. Start a new chat after uploading documents.
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}
