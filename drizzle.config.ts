import { defineConfig } from "drizzle-kit";

// Migrations require direct connection (not pooled) to support DDL operations
// Use DIRECT_DATABASE_URL if available, otherwise fall back to DATABASE_URL
const migrationUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL required - ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
