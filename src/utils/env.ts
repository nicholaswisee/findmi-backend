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
    CLOUDINARY_CLOUD_NAME: z.string(),
    CLOUDINARY_API_KEY: z.string(),
    CLOUDINARY_API_SECRET: z.string(),
  });

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.message);
    process.exit(1);
  }
}
