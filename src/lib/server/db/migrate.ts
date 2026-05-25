import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/learning_map';

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: './drizzle' });
await pool.end();
console.log('migrations applied');
