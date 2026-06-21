ALTER TABLE "notes" ADD COLUMN "tags_text" text DEFAULT '' NOT NULL;
--> statement-breakpoint
DROP TRIGGER IF EXISTS notes_search_vector_trg ON notes;
--> statement-breakpoint
DROP FUNCTION IF EXISTS notes_search_vector_update();
--> statement-breakpoint
CREATE FUNCTION notes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.tags_text,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.plaintext,'')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER notes_search_vector_trg BEFORE INSERT OR UPDATE OF title, plaintext, tags_text
  ON notes FOR EACH ROW EXECUTE FUNCTION notes_search_vector_update();
