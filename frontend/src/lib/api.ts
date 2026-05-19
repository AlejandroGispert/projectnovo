import { clearAuth, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401 && auth) {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Unauthorized", 401);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      /* ignore */
    }
    throw new ApiError(String(detail), res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type User = { id: string; email: string };
export type TokenResponse = { access_token: string; token_type: string; user: User };

export type Document = {
  id: string;
  filename: string;
  content_type: string;
  status: "pending" | "processing" | "ready" | "failed";
  chunk_count: number;
  error_message: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_preview?: string | null;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Array<{
    document_id?: string;
    filename?: string;
    chunk_index?: number;
    text_preview?: string;
  }> | null;
  created_at: string;
};

export const api = {
  register: (email: string, password: string) =>
    request<TokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false),

  login: (email: string, password: string) => {
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    return request<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }, false);
  },

  me: () => request<User>("/api/v1/auth/me"),

  listDocuments: () => request<Document[]>("/api/v1/documents"),

  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Document>("/api/v1/documents/upload", { method: "POST", body: form });
  },

  deleteDocument: (id: string) =>
    request<void>(`/api/v1/documents/${id}`, { method: "DELETE" }),

  listConversations: () => request<Conversation[]>("/api/v1/chat/conversations"),

  createConversation: (title?: string) =>
    request<Conversation>("/api/v1/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  listMessages: (conversationId: string) =>
    request<Message[]>(`/api/v1/chat/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, content: string) =>
    request<{ user_message: Message; assistant_message: Message }>(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify({ content }) },
    ),
};
