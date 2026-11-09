import pool from "./db";

Bun.serve({
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

      if (method === "GET" && url.pathname === "/state") {
        const result = await pool.query("SELECT payload FROM app_state WHERE id = 1");
        const payload = result.rows[0]?.payload ?? { users: [], activeUserId: "", tasks: [] };
        return Response.json(payload, { headers });
      }

      if (method === "PUT" && url.pathname === "/state") {
        const body = await req.json();

        await pool.query(
          `
            INSERT INTO app_state (id, payload)
            VALUES (1, $1::jsonb)
            ON CONFLICT (id)
            DO UPDATE SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP
          `,
          [JSON.stringify(body)]
        );

        return Response.json({ message: "State saved" }, { headers });
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

pool
  .query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  .then(() =>
    pool.query(
      `
      INSERT INTO app_state (id, payload)
      VALUES (1, '{"users": [], "activeUserId": "", "tasks": []}'::jsonb)
      ON CONFLICT (id) DO NOTHING
    `
    )
  )
  .then(() =>
    pool.query(`
      CREATE OR REPLACE VIEW app_tasks AS
      SELECT
        task->>'id' AS id,
        task->>'title' AS title,
        COALESCE((task->>'completed')::boolean, false) AS completed,
        task->>'completedOn' AS completed_on,
        COALESCE((task->>'isDaily')::boolean, false) AS is_daily,
        task->>'dailyTime' AS daily_time,
        task->>'startDate' AS start_date,
        task->>'endDate' AS end_date,
        task->>'createdByUserId' AS created_by_user_id,
        task->>'deadlineByUserId' AS deadline_by_user_id,
        task->'assignedUserIds' AS assigned_user_ids,
        task->'participantUserIds' AS participant_user_ids,
        task->'subtasks' AS subtasks,
        task->'progressByUserId' AS progress_by_user_id
      FROM app_state
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(payload->'tasks', '[]'::jsonb)) AS task
      WHERE app_state.id = 1;

      CREATE OR REPLACE VIEW app_notes AS
      SELECT
        note->>'id' AS id,
        note->>'title' AS title,
        note->>'content' AS content,
        note->>'createdByUserId' AS created_by_user_id,
        note->>'createdAt' AS created_at,
        note->>'updatedAt' AS updated_at
      FROM app_state
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(payload->'notes', '[]'::jsonb)) AS note
      WHERE app_state.id = 1;

      CREATE OR REPLACE VIEW app_job_applications AS
      SELECT
        application->>'id' AS id,
        application->>'company' AS company,
        application->>'role' AS role,
        application->>'status' AS status,
        application->>'appliedDate' AS applied_date,
        application->>'jobUrl' AS job_url,
        application->>'notes' AS notes,
        application->>'createdByUserId' AS created_by_user_id,
        application->>'createdAt' AS created_at,
        application->>'updatedAt' AS updated_at
      FROM app_state
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(payload->'jobApplications', '[]'::jsonb)) AS application
      WHERE app_state.id = 1;

      CREATE OR REPLACE VIEW app_users AS
      SELECT
        app_user->>'id' AS id,
        app_user->>'name' AS name,
        NULLIF(app_user->>'age', '')::integer AS age,
        app_user->>'dailyFocus' AS daily_focus,
        (app_user->>'id' = app_state.payload->>'activeUserId') AS is_active
      FROM app_state
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(payload->'users', '[]'::jsonb)) AS app_user
      WHERE app_state.id = 1;
    `)
  )
  .then(() => console.log("App state tables and query views checked/created"))
  .catch((error) => console.error("Failed to initialize database schema:", error));