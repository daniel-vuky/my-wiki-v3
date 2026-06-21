import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

export interface SearchResult {
  id: string; title: string; folderId: string | null; updatedAt: string;
  titleHl: string; snippetHl: string; rank: number;
}

export async function searchNotes(userId: string, q: string, opts: { folderId?: string } = {}) {
  if (!q.trim()) return { results: [] as SearchResult[], folderFacets: [] as { folderId: string | null; c: number }[] };
  const folderFilter = opts.folderId ? sql`AND folder_id = ${opts.folderId}` : sql``;
  const rows = await db.execute(sql`
    SELECT id, title, folder_id AS "folderId", updated_at AS "updatedAt",
      ts_headline('english', title, websearch_to_tsquery('english', ${q}),
        'StartSel=<mark>,StopSel=</mark>') AS "titleHl",
      ts_headline('english', plaintext, websearch_to_tsquery('english', ${q}),
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=30,MinWords=10') AS "snippetHl",
      ts_rank(search_vector, websearch_to_tsquery('english', ${q})) AS rank
    FROM notes
    WHERE user_id = ${userId} ${folderFilter}
      AND search_vector @@ websearch_to_tsquery('english', ${q})
    ORDER BY rank DESC LIMIT 50
  `);
  const facets = await db.execute(sql`
    SELECT folder_id AS "folderId", count(*)::int AS c FROM notes
    WHERE user_id = ${userId} AND search_vector @@ websearch_to_tsquery('english', ${q})
    GROUP BY folder_id
  `);
  return { results: rows.rows as unknown as SearchResult[], folderFacets: facets.rows as any };
}
