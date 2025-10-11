import { config } from 'dotenv';
import { z } from 'zod';

export function loadEnv() {
  config();
  const schema = z.object({
    DATABASE_URL: z.url(),
    PORT: z.string().optional(),
    JWT_SECRET: z.string().optional(),
  });

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.message);
    process.exit(1);
  }
}
