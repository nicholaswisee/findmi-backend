import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, types as pgTypes } from 'pg';
import * as schema from './schema';
import { config } from 'dotenv';

config();

const TIMESTAMP_OID = 1114;
const TIMESTAMPTZ_OID = 1184;
const FALLBACK_OFFSET = '+07:00';

const timezoneOffset =
  typeof process.env.APP_TIMEZONE_OFFSET === 'string' &&
  /^[+-](0\d|1[0-4]):[0-5]\d$/.test(process.env.APP_TIMEZONE_OFFSET)
    ? process.env.APP_TIMEZONE_OFFSET
    : FALLBACK_OFFSET;

// Parse timestamp columns as Asia/Jakarta (or provided offset) to avoid double
// shifting times when the DB stores local timestamps without timezone info.
pgTypes.setTypeParser(TIMESTAMP_OID, (value: string) => {
  const normalized = value.replace(' ', 'T');
  return new Date(`${normalized}${timezoneOffset}`);
});
pgTypes.setTypeParser(TIMESTAMPTZ_OID, (value: string) => new Date(value));

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export { schema };
