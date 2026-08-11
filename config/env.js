const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const envSchema = z.object({
  PORT: z.coerce.number().default(5001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CLIENT_URL: z.string().min(1, "CLIENT_URL is required"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  const logger = require("../utils/logger");
  logger.error(
    { err: parseResult.error.format() },
    "❌ Invalid environment configuration"
  );
  process.exit(1);
}

module.exports = parseResult.data;
