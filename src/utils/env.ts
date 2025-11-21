import { config } from 'dotenv';
import { z } from 'zod';

export function loadEnv() {
  config();
  const schema = z.object({
    DATABASE_URL: z.url(),
    PORT: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_REDIRECT_URI: z.string(),
    JWT_SECRET: z.string(),
    COOKIE_DOMAIN: z.string(),
    FRONTEND_URL: z.string().optional(),
    UPLOADS_DIR: z.string().optional(),
    UPLOADS_PUBLIC_PATH: z.string().optional(),
    UPLOADS_BASE_URL: z.string().url().optional(),
    APP_TIMEZONE_OFFSET: z
      .string()
      .regex(/^[+-](0\d|1[0-4]):[0-5]\d$/, 'Format offset harus +/-HH:MM')
      .optional(),
    MIDTRANS_MERCHANT_ID: z.string(),
    MIDTRANS_CLIENT_KEY: z.string(),
    MIDTRANS_SERVER_KEY: z.string(),
  });

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.message);
    process.exit(1);
  }
}
