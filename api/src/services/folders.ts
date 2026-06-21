import { and, eq, asc, count } from "drizzle-orm";
import { db } from "../db/client.js";
import { folders, notes } from "../db/schema.js";

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function listFolders(userId: string) {
  const rows = await db.select().from(folders).where(eq(folders.userId, userId)).orderBy(asc(folders.sortOrder));
  const counts = await db.select({ folderId: notes.folderId, c: count() })
    .from(notes).where(eq(notes.userId, userId)).groupBy(notes.folderId);
  const map = new Map(counts.map((r) => [r.folderId, Number(r.c)]));
  return rows.map((f) => ({ ...f, count: map.get(f.id) ?? 0 }));
}

export async function createFolder(userId: string, data: { name: string; color: string; description?: string }) {
  const [row] = await db.insert(folders).values({
    userId, name: data.name, slug: slugify(data.name), color: data.color, description: data.description ?? "",
  }).returning();
  return row;
}

export async function updateFolder(userId: string, id: string, data: Partial<{ name: string; color: string; description: string; sortOrder: number }>) {
  const patch: any = { ...data, updatedAt: new Date() };
  if (data.name) patch.slug = slugify(data.name);
  const [row] = await db.update(folders).set(patch).where(and(eq(folders.id, id), eq(folders.userId, userId))).returning();
  return row;
}

export async function deleteFolder(userId: string, id: string) {
  await db.delete(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
}
