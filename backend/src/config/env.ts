import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters for enterprise security').default('namaz_secure_jwt_secret_key_prod_10k'),
  JWT_EXPIRES_IN: z.string().default('30d'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 mins
  RATE_LIMIT_MAX: z.string().transform(Number).default('1000') // scalable for active sync
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables configuration:', parsed.error.format());
  throw new Error('Environment configuration error. Please check your .env setup.');
}

export const env = parsed.data;
