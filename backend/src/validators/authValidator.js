const { z } = require("zod");

const MIN_AGE = 13;

const toUTCDate = (s) => new Date(`${s}T00:00:00.000Z`);

const isRealDate = (s) => {
  const d = toUTCDate(s);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(254),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters") // bcrypt only uses the first 72 bytes
    .regex(/[a-z]/, "Password needs a lowercase letter")
    .regex(/[A-Z]/, "Password needs an uppercase letter")
    .regex(/[0-9]/, "Password needs a number"),
  dob: z
    .string({ required_error: "Date of birth is required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format")
    .refine(isRealDate, "Date of birth is not a valid date")
    .refine((s) => toUTCDate(s) <= new Date(), "Date of birth cannot be in the future")
    .refine((s) => {
      const limit = new Date();
      limit.setUTCFullYear(limit.getUTCFullYear() - MIN_AGE);
      return toUTCDate(s) <= limit;
    }, `You must be at least ${MIN_AGE} years old`),
});

const loginSchema = z.object({
  email: z.string({ required_error: "Email is required" }).trim().toLowerCase().email("Invalid email address"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required").max(128),
});

module.exports = { registerSchema, loginSchema };
