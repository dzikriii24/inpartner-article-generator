import os
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    print("Setting database default collation to utf8mb4...")
    conn.execute(text("ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    for table in tables:
        print(f"Altering table {table} to utf8mb4...")
        try:
            conn.execute(text(f"ALTER TABLE `{table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
        except Exception as e:
            print(f"Warning altering {table}: {e}")
            
    conn.commit()
    print("Successfully converted all MySQL tables to utf8mb4!")
