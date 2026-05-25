import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const connectionString =
  env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/learning_map';

export const pool = new pg.Pool({ connectionString });
export const db = drizzle(pool, { schema });
