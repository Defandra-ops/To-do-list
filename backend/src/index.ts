import pool from "./db";

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers });

    try {
      if (url.pathname === "/" && method === "GET") {
         return new Response("Backend is Running!", { headers });
      }

      if (method === "GET" && url.pathname === "/todos") {
        const result = await pool.query("SELECT * FROM todos ORDER BY id ASC");
        return Response.json(result.rows, { headers });
      }

      if (method === "POST" && url.pathname === "/todos") {
      const body = await req.json();
      const result = await pool.query(
        "INSERT INTO todos (title) VALUES ($1) RETURNING *",
        [body.title]
      );
      return Response.json(result.rows[0], { headers });
    }

      if (method === "PUT" && url.pathname.startsWith("/todos/")) {
        const id = url.pathname.split("/")[2];
        const result = await pool.query(
          "UPDATE todos SET completed = NOT completed WHERE id = $1 RETURNING *",
          [id]
        );
        return Response.json(result.rows[0], { headers });
      }

      if (method === "DELETE" && url.pathname.startsWith("/todos/")) {
        const id = url.pathname.split("/")[2];
        await pool.query("DELETE FROM todos WHERE id = $1", [id]);
        return Response.json({ message: "Deleted" }, { headers });
      }
      
      return new Response("Not Found", { status: 404, headers });

    } catch (error) {
      console.error(error);
      return new Response("Internal Server Error", { status: 500, headers });
    }
  },
});


pool.query(`
  CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => console.log("Database table checked/created"));