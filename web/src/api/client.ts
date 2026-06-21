import type { User, Prefs, Folder, Note, TagCount, SearchResponse } from "../types";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  if (res.status === 401) { window.location.href = "/signin"; throw new Error("unauthorized"); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any));
    throw new Error(body?.error?.message ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

export const api = {
  me: () => req<{ user: User; prefs: Prefs }>("/api/auth/me"),
  logout: () => req("/api/auth/logout", { method: "POST" }),
  folders: () => req<Folder[]>("/api/folders"),
  createFolder: (b: { name: string; color: string; description?: string }) => req<Folder>("/api/folders", { method: "POST", body: JSON.stringify(b) }),
  notes: (q?: { folder?: string; favorite?: boolean }) =>
    req<Note[]>("/api/notes" + (q?.folder ? `?folder=${q.folder}` : q?.favorite ? "?favorite=true" : "")),
  note: (id: string) => req<Note>(`/api/notes/${id}`),
  createNote: (b: { folderId?: string; title?: string }) => req<Note>("/api/notes", { method: "POST", body: JSON.stringify(b) }),
  updateNote: (id: string, b: Partial<{ title: string; content: string; folderId: string | null; tags: string[] }>) =>
    req<Note>(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  favorite: (id: string) => req<{ id: string; favorite: boolean }>(`/api/notes/${id}/favorite`, { method: "POST" }),
  deleteNote: (id: string) => req(`/api/notes/${id}`, { method: "DELETE" }),
  tags: () => req<TagCount[]>("/api/tags"),
  search: (q: string, folder?: string) => req<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}${folder ? `&folder=${folder}` : ""}`),
};
