require("dotenv").config();
const { z } = require("zod");

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().url(),
  MONGO_URI: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("mongodb://") || v.startsWith("mongodb+srv://"), {
      message: "must start with mongodb:// or mongodb+srv://",
    })
    .refine((v) => {
      const url = new URL(v.replace(/^mongodb\+srv:/, "http:"));
      return url.pathname && url.pathname !== "/" && url.pathname !== "";
    }, "MongoDB URI must include database name in path (e.g., .../healthtrack)"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().int().min(1).max(30).default(7),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  parsed.error.issues.forEach((i) => console.error(` - ${i.path.join(".")}: ${i.message}`));
  process.exit(1);
}

module.exports = parsed.data;
