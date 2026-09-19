/**
 * LifeOS migration runner — applies database/migrations/*.sql in filename
 * order, tracking applied files in schema_migrations. Plain `pg`, no CLI.
 *
 * Run from the repo root via `npm run db:migrate` (cwd = apps/web).
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

// apps/web/scripts → repo root/database/migrations
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../database/migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("missing DATABASE_URL — copy apps/web/.env.example to .env.local and run `npm run db:up`");
  }
  const pool = new Pool({ connectionString: url });

  await pool.query(`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = 0;
  for (const file of files) {
    const { rowCount } = await pool.query("select 1 from schema_migrations where name = $1", [file]);
    if (rowCount) continue;

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
    console.log(`applied ${file}`);
    applied++;
  }
  console.log(applied === 0 ? "nothing to apply — up to date" : `migrations complete (${applied} applied)`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
