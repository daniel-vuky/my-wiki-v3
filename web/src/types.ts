export type Theme = "dark" | "light";
export type Accent = "amber" | "teal" | "blue" | "rose";
export type EditorFont = "Serif" | "Sans";

export interface User { id: string; email: string; name: string; avatarUrl?: string | null }
export interface Prefs { theme: Theme; accent: Accent; editorFont: EditorFont }
export interface Folder { id: string; name: string; slug: string; color: string; description: string; sortOrder: number; count: number; parentId: string | null }
export interface Note {
  id: string; folderId: string | null; title: string; content: string;
  favorite: boolean; updatedAt: string; createdAt: string; tags: string[];
}
export interface TagCount { id: string; name: string; c: number }
export interface SearchResult { id: string; title: string; folderId: string | null; updatedAt: string; titleHl: string; snippetHl: string; rank: number }
export interface SearchResponse { results: SearchResult[]; folderFacets: { folderId: string | null; c: number }[] }
