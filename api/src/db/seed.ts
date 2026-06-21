import { eq, count } from "drizzle-orm";
import { db } from "./client.js";
import { folders, notes } from "./schema.js";
import { slugify } from "../services/folders.js";
import { setNoteTags } from "../services/tags.js";

interface FolderDef {
  name: string;
  color: string;
  description: string;
  sortOrder: number;
}

const SEED_FOLDERS: FolderDef[] = [
  { name: "Engineering", color: "#e0a548", description: "Systems, architecture & infrastructure notes", sortOrder: 0 },
  { name: "Reading",     color: "#4fb3a3", description: "Books, highlights & reading lists",           sortOrder: 1 },
  { name: "Ideas",       color: "#a89adf", description: "Half-formed thoughts & sparks",               sortOrder: 2 },
  { name: "Recipes",     color: "#d98a8a", description: "Things worth cooking again",                  sortOrder: 3 },
  { name: "Health",      color: "#7cba6a", description: "Training, sleep & wellbeing",                 sortOrder: 4 },
  { name: "Travel",      color: "#6fa8dc", description: "Places, trips & itineraries",                 sortOrder: 5 },
];

function makeContent(heading: string, ...paragraphs: string[]): string {
  const blocks = [
    {
      id: "h1",
      type: "heading",
      props: { level: 2 },
      content: [{ type: "text", text: heading, styles: {} }],
      children: [],
    },
    ...paragraphs.map((text, i) => ({
      id: `p${i + 1}`,
      type: "paragraph",
      props: {},
      content: [{ type: "text", text, styles: {} }],
      children: [],
    })),
  ];
  return JSON.stringify(blocks);
}

interface SampleNote {
  title: string;
  plaintext: string;
  content: string;
  tags: string[];
}

const SAMPLE_NOTES: SampleNote[] = [
  {
    title: "Notes on Distributed Systems",
    plaintext:
      "Consensus algorithms like Raft and Paxos ensure all nodes agree on a value even in the presence of failures. " +
      "Replication strategies (synchronous vs asynchronous) trade durability for latency. " +
      "CAP theorem forces a choice between consistency and availability during network partitions.",
    content: makeContent(
      "Notes on Distributed Systems",
      "Consensus algorithms like Raft and Paxos ensure all nodes agree on a value even in the presence of failures.",
      "Replication strategies (synchronous vs asynchronous) trade durability for latency. CAP theorem forces a choice between consistency and availability during network partitions.",
    ),
    tags: ["systems", "distributed"],
  },
  {
    title: "Postgres indexing deep-dive",
    plaintext:
      "B-tree indexes are the default and work well for equality and range queries on ordered data. " +
      "GIN (Generalized Inverted Index) indexes excel for full-text search and array/jsonb containment queries. " +
      "Partial indexes and expression indexes allow fine-grained control over what gets indexed.",
    content: makeContent(
      "Postgres indexing deep-dive",
      "B-tree indexes are the default and work well for equality and range queries on ordered data.",
      "GIN (Generalized Inverted Index) indexes excel for full-text search and array/jsonb containment queries. Partial indexes and expression indexes allow fine-grained control over what gets indexed.",
    ),
    tags: ["postgres", "systems"],
  },
  {
    title: "Designing idempotent APIs",
    plaintext:
      "Idempotency keys let clients safely retry requests without causing duplicate side-effects. " +
      "Store the key alongside the result; on a retry return the cached response instead of re-executing. " +
      "Use a unique constraint on the idempotency key column and return 409 on collision until processing is complete.",
    content: makeContent(
      "Designing idempotent APIs",
      "Idempotency keys let clients safely retry requests without causing duplicate side-effects.",
      "Store the key alongside the result; on a retry return the cached response instead of re-executing. Use a unique constraint on the idempotency key column and return 409 on collision until processing is complete.",
    ),
    tags: ["design", "systems"],
  },
];

export async function seedUser(userId: string): Promise<void> {
  // Idempotency guard: skip if user already has folders
  const [{ folderCount }] = await db
    .select({ folderCount: count() })
    .from(folders)
    .where(eq(folders.userId, userId));

  if (Number(folderCount) > 0) return;

  // Insert all 6 seed folders
  const inserted = await db
    .insert(folders)
    .values(
      SEED_FOLDERS.map((f) => ({
        userId,
        name: f.name,
        slug: slugify(f.name),
        color: f.color,
        description: f.description,
        sortOrder: f.sortOrder,
      })),
    )
    .returning();

  // Find the Engineering folder to attach sample notes
  const engineeringFolder = inserted.find((f) => f.name === "Engineering");
  if (!engineeringFolder) return;

  // Insert sample notes into Engineering
  for (const noteDef of SAMPLE_NOTES) {
    const [row] = await db
      .insert(notes)
      .values({
        userId,
        folderId: engineeringFolder.id,
        title: noteDef.title,
        content: noteDef.content,
        plaintext: noteDef.plaintext,
      })
      .returning({ id: notes.id });

    await setNoteTags(userId, row.id, noteDef.tags);
  }
}

// CLI escape hatch: `tsx src/db/seed.ts <userId>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const userId = process.argv[2];
  if (!userId) {
    console.error("usage: npm run seed <userId>");
    process.exit(1);
  }
  seedUser(userId).then(() => {
    console.log("seeded", userId);
    process.exit(0);
  });
}
