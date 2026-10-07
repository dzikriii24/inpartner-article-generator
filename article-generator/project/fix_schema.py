from database import engine
from sqlalchemy import text

def sync_schema():
    columns_to_add = [
        ("topics", "user_prompt", "TEXT NULL"),
        ("topics", "angle", "TEXT NULL"),
        ("sources", "image_url", "VARCHAR(500) NULL"),
        ("generated_articles", "subtitle", "TEXT NULL"),
        ("generated_articles", "category", "VARCHAR(100) NULL"),
        ("generated_articles", "author", "VARCHAR(100) DEFAULT 'AI Editorial Board' NULL"),
        ("generated_articles", "reading_time", "INT DEFAULT 5 NULL"),
        ("generated_articles", "hero_image_url", "VARCHAR(500) NULL"),
        ("generated_articles", "hero_image_caption", "VARCHAR(500) NULL"),
        ("generated_articles", "images_metadata", "JSON NULL"),
        ("generated_articles", "content_blocks", "JSON NULL"),
        ("generated_articles", "user_prompt", "TEXT NULL"),
        ("generated_articles", "generation_step", "VARCHAR(100) DEFAULT 'COMPLETED' NULL"),
        ("generated_articles", "error_message", "TEXT NULL"),
        ("generated_articles", "research_metadata", "JSON NULL"),
        ("generated_articles", "citations", "JSON NULL"),
        ("generated_articles", "wordpress_post_id", "INT NULL"),
        ("generated_articles", "wordpress_site", "VARCHAR(255) NULL"),
        ("generated_articles", "wordpress_status", "VARCHAR(50) DEFAULT 'Not Published' NULL"),
        ("generated_articles", "last_synced_at", "DATETIME NULL"),
        ("generated_articles", "sync_status", "VARCHAR(100) NULL"),
        ("sources", "author", "VARCHAR(255) NULL"),
        ("sources", "source_domain", "VARCHAR(255) NULL"),
        ("sources", "relevance_score", "FLOAT DEFAULT 0.0 NULL"),
        ("sources", "credibility_metadata", "JSON NULL"),
        ("claims", "source_id", "INT NULL"),
        ("claims", "publisher", "VARCHAR(255) NULL"),
        ("claims", "url", "VARCHAR(500) NULL"),
        ("claims", "published_at", "DATETIME NULL"),
    ]

    with engine.connect() as conn:
        # Check topic_id column nullability & modify url and title columns to TEXT
        try:
            conn.execute(text("ALTER TABLE generated_articles MODIFY COLUMN topic_id INT NULL"))
            conn.execute(text("ALTER TABLE sources MODIFY COLUMN url TEXT"))
            conn.execute(text("ALTER TABLE claims MODIFY COLUMN url TEXT NULL"))
            conn.execute(text("ALTER TABLE topics MODIFY COLUMN title TEXT NULL"))
            conn.execute(text("ALTER TABLE generated_articles MODIFY COLUMN title TEXT NULL"))
            conn.commit()
            print("Modified topic_id, url, and title columns to TEXT")
        except Exception as e:
            print("Modify notice:", e)

        for table, col, col_def in columns_to_add:
            try:
                # Check if column exists first for MySQL compatibility
                check_sql = text(f"""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' AND column_name = '{col}'
                """)
                res = conn.execute(check_sql).scalar()
                if res == 0:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                    conn.commit()
                    print(f"Added column {col} to {table}")
                else:
                    print(f"Column {col} already exists in {table}")
            except Exception as e:
                print(f"Error checking/adding {col} to {table}: {e}")

if __name__ == "__main__":
    sync_schema()
    print("Schema sync finished successfully!")
