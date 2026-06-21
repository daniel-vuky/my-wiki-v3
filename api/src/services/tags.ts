import { and, eq, count } from "drizzle-orm";
import { db } from "../db/client.js";
import { tags, noteTags, notes } from "../db/schema.js";

export async function ensureTags(userId: string, names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const existing = await db.select().from(tags).where(and(eq(tags.userId, userId), eq(tags.name, name)));
    if (existing[0]) ids.push(existing[0].id);
    else {
      const [row] = await db.insert(tags).values({ userId, name }).returning({ id: tags.id });
      ids.push(row.id);
    }
  }
  return ids;
}

export async function setNoteTags(userId: string, noteId: string, names: string[]) {
  await db.delete(noteTags).where(eq(noteTags.noteId, noteId));
  const ids = await ensureTags(userId, names);
  if (ids.length) await db.insert(noteTags).values(ids.map((tagId) => ({ noteId, tagId })));
  await db.update(notes).set({ tagsText: names.join(" ") }).where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
}

export async function listTags(userId: string) {
  return db.select({ id: tags.id, name: tags.name, c: count(noteTags.noteId) })
    .from(tags)
    .leftJoin(noteTags, eq(noteTags.tagId, tags.id))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id, tags.name);
}

export async function tagsForNote(noteId: string): Promise<string[]> {
  const rows = await db.select({ name: tags.name }).from(noteTags)
    .innerJoin(tags, eq(tags.id, noteTags.tagId)).where(eq(noteTags.noteId, noteId));
  return rows.map((r) => r.name);
}
