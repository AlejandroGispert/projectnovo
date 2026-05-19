"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { api, ApiError, Document } from "@/lib/api";

function statusColor(status: Document["status"]) {
  switch (status) {
    case "ready":
      return "text-emerald-400 bg-emerald-400/10";
    case "failed":
      return "text-red-400 bg-red-400/10";
    case "processing":
      return "text-amber-400 bg-amber-400/10";
    default:
      return "text-slate-400 bg-slate-400/10";
  }
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load documents");
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await api.uploadDocument(file);
      input.value = "";
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await api.deleteDocument(id);
    await load();
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <section>
          <h1 className="text-2xl font-semibold text-white">Documents</h1>
          <p className="mt-1 text-sm text-muted">
            Upload PDF, Markdown, or text files. They will be indexed for chat.
          </p>
        </section>

        <form
          onSubmit={onUpload}
          className="rounded-2xl border border-dashed border-slate-700 bg-panel p-6"
        >
          <input
            type="file"
            name="file"
            accept=".pdf,.md,.markdown,.txt"
            className="block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-white"
          />
          <button
            type="submit"
            disabled={uploading}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <ul className="space-y-3">
          {documents.length === 0 && (
            <li className="rounded-xl border border-slate-800 bg-panel p-6 text-center text-muted">
              No documents yet. Upload your first file.
            </li>
          )}
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-panel px-4 py-3"
            >
              <div>
                <p className="font-medium text-white">{doc.filename}</p>
                <p className="text-xs text-muted">
                  {doc.chunk_count} chunks · {new Date(doc.created_at).toLocaleString()}
                </p>
                {doc.error_message && (
                  <p className="mt-1 text-xs text-red-400">{doc.error_message}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(doc.status)}`}
                >
                  {doc.status}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(doc.id)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
