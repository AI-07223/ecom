/**
 * Idempotent Medusa admin user provisioning.
 *
 * Wraps `medusa user -e ... -p ...` so the first-run experience is one
 * command. Detects an existing user with the configured email and exits
 * cleanly without re-creating.
 *
 * Run with:  npm run admin:create
 */

import { spawn } from "node:child_process"
import { config as loadDotenv } from "dotenv"
import { Client } from "pg"

loadDotenv()

function require(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`admin-create: ${name} is not set; configure it in .env`)
    process.exit(2)
  }
  return v
}

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const user = require("POSTGRES_USER")
  const password = require("POSTGRES_PASSWORD")
  const db = require("POSTGRES_DB")
  const port = process.env.POSTGRES_PORT ?? "5432"
  return `postgres://${user}:${password}@localhost:${port}/${db}`
}

async function userExists(email: string): Promise<boolean> {
  const client = new Client({ connectionString: buildDatabaseUrl() })
  await client.connect()
  try {
    const { rows } = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM \"user\" WHERE email = $1",
      [email],
    )
    return Number(rows[0]?.count ?? "0") > 0
  } finally {
    await client.end()
  }
}

function runMedusaUser(email: string, password: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "docker",
      [
        "exec",
        "platform-medusa-1",
        "sh",
        "-c",
        `cd /app/apps/backend && npx --no-install medusa user -e ${shellEscape(email)} -p ${shellEscape(password)}`,
      ],
      { stdio: "inherit" },
    )
    proc.on("error", reject)
    proc.on("exit", (code) => resolve(code ?? 0))
  })
}

function shellEscape(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`
}

async function main(): Promise<void> {
  const email = require("MEDUSA_ADMIN_EMAIL")
  const password = require("MEDUSA_ADMIN_PASSWORD")

  if (await userExists(email)) {
    console.log(`admin-create: user ${email} already exists; skipping.`)
    return
  }

  console.log(`admin-create: creating Medusa admin ${email}...`)
  const code = await runMedusaUser(email, password)
  if (code !== 0) {
    console.error(`admin-create: medusa CLI exited with ${code}`)
    process.exit(code)
  }
  console.log(`admin-create: done.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
