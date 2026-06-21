import { and, eq, desc, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { notes, noteTags, tags } from "../db/schema.js";
import { blocksToPlaintext } from "../lib/markdown.js";
import { setNoteTags, tagsForNote } from "./tags.js";

export async function listNotes(userId: string, opts: { folderId?: string; favorite?: boolean; tag?: string } = {}) {
  const conds = [eq(notes.userId, userId)];
  if (opts.folderId) conds.push(eq(notes.folderId, opts.folderId));
  if (opts.favorite) conds.push(eq(notes.favorite, true));
  if (opts.tag) {
    const tagged = db.select({ id: noteTags.noteId }).from(noteTags)
      .innerJoin(tags, eq(tags.id, noteTags.tagId))
      .where(and(eq(tags.userId, userId), eq(tags.name, opts.tag)));
    conds.push(inArray(notes.id, tagged));
  }
  const rows = await db.select().from(notes).where(and(...conds)).orderBy(desc(notes.updatedAt));
  return Promise.all(rows.map(async (n) => ({ ...n, tags: await tagsForNote(n.id) })));
}

export async function getNote(userId: string, id: string) {
  const [n] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  if (!n) return null;
  return { ...n, tags: await tagsForNote(n.id) };
}

export async function createNote(userId: string, data: { folderId?: string; title?: string }) {
  const [row] = await db.insert(notes).values({
    userId, folderId: data.folderId ?? null, title: data.title ?? "Untitled",
  }).returning();
  return { ...row, tags: [] as string[] };
}

export async function updateNote(userId: string, id: string, data: {
  title?: string; content?: string; folderId?: string | null; tags?: string[];
}) {
  const patch: any = { updatedAt: new Date() };
  if (data.title !== undefined) patch.title = data.title;
  if (data.folderId !== undefined) patch.folderId = data.folderId;
  if (data.content !== undefined) {
    patch.content = data.content;
    patch.plaintext = blocksToPlaintext(data.content);
  }
  await db.update(notes).set(patch).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  if (data.tags) await setNoteTags(userId, id, data.tags);
  return getNote(userId, id);
}

export async function toggleFavorite(userId: string, id: string) {
  const [n] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  if (!n) return null;
  await db.update(notes).set({ favorite: !n.favorite }).where(eq(notes.id, id));
  return { id, favorite: !n.favorite };
}

export async function deleteNote(userId: string, id: string) {
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}
