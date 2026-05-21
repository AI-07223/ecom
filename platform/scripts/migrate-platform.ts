/**
 * Platform-level migration runner.
 *
 * Applies every `scripts/migrations/*.sql` file in lexicographic order against
 * the database identified by DATABASE_URL. Tracks applied filenames in a
 * `_platform_migrations` table so reruns are idempotent.
 *
 * Run with:
 *   npm run migrate:platform
 */

import { promises as fs } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { config as loadDotenv } from "dotenv"
import { Client } from "pg"

loadDotenv()

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, "migrations")

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const user = process.env.POSTGRES_USER
  const password = process.env.POSTGRES_PASSWORD
  const db = process.env.POSTGRES_DB
  const port = process.env.POSTGRES_PORT ?? "5432"
  if (!user || !password || !db) {
    throw new Error(
      "DATABASE_URL not set and POSTGRES_USER/PASSWORD/DB are incomplete",
    )
  }
  return `postgres://${user}:${password}@localhost:${port}/${db}`
}

async function ensureLedger(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _platform_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `)
}

async function appliedSet(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{ name: string }>(
    "SELECT name FROM _platform_migrations",
  )
  return new Set(rows.map((r) => r.name))
}

async function main(): Promise<void> {
  const url = buildDatabaseUrl()
  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    await ensureLedger(client)
    const applied = await appliedSet(client)

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort()

    let ran = 0
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[skip] ${file} (already applied)`)
        continue
      }
      const sql = await fs.readFile(join(MIGRATIONS_DIR, file), "utf8")
      await client.query("BEGIN")
      try {
        await client.query(sql)
        await client.query(
          "INSERT INTO _platform_migrations (name) VALUES ($1)",
          [file],
        )
        await client.query("COMMIT")
        console.log(`[ok]   ${file}`)
        ran++
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      }
    }

    console.log(
      ran === 0
        ? "Platform schema up to date."
        : `Applied ${ran} migration${ran === 1 ? "" : "s"}.`,
    )
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
