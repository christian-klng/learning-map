// Production migrator. Plain ESM so it runs without tsx / TypeScript in the prod image.
// Invoked by Dockerfile CMD before starting the SvelteKit server.
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[migrate] DATABASE_URL is not set');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('[migrate] migrations applied');
} catch (err) {
  console.error('[migrate] failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}
