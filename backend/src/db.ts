import { Pool } from "pg";

// Menggunakan environment variable atau default string untuk Docker
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://user:password@db:5432/todo_db",
});

export default pool;