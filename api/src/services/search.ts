import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

export interface SearchResult {
  id: string; title: string; folderId: string | null; updatedAt: string;
  titleHl: string; snippetHl: string; rank: number;
}

export interface FolderFacet { folderId: string | null; c: number }

// Turn a raw user query into a Postgres `to_tsquery` PREFIX expression so that
// partial words match (e.g. "hel" matches "hello"). Each whitespace-separated
// term is stripped of tsquery-special characters and suffixed with `:*`, and
// terms are AND-ed together. Returns "" when there is no usable term.
export function buildPrefixQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .map((t) => `${t}:*`)
    .join(" & ");
}

export async function searchNotes(userId: string, q: string, opts: { folderId?: string } = {}) {
  const tsq = buildPrefixQuery(q);
  if (!tsq) return { results: [] as SearchResult[], folderFacets: [] as FolderFacet[] };
  const folderFilter = opts.folderId ? sql`AND folder_id = ${opts.folderId}` : sql``;
  const rows = await db.execute(sql`
    SELECT id, title, folder_id AS "folderId", updated_at AS "updatedAt",
      ts_headline('english', title, to_tsquery('english', ${tsq}),
        'StartSel=<mark>,StopSel=</mark>') AS "titleHl",
      ts_headline('english', plaintext, to_tsquery('english', ${tsq}),
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=30,MinWords=10') AS "snippetHl",
      ts_rank(search_vector, to_tsquery('english', ${tsq})) AS rank
    FROM notes
    WHERE user_id = ${userId} ${folderFilter}
      AND search_vector @@ to_tsquery('english', ${tsq})
    ORDER BY rank DESC LIMIT 50
  `);
  const facets = await db.execute(sql`
    SELECT folder_id AS "folderId", count(*)::int AS c FROM notes
    WHERE user_id = ${userId} AND search_vector @@ to_tsquery('english', ${tsq})
    GROUP BY folder_id
  `);
  return { results: rows.rows as unknown as SearchResult[], folderFacets: facets.rows as unknown as FolderFacet[] };
}
