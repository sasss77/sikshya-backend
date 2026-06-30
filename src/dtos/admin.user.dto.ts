import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
  .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
  .regex(/[0-9]/, "Password must contain at least 1 number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least 1 special character"
  );

export const AdminCreateUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters long").trim(),
  email: z.string().email("Invalid email format"),
  role: z.enum(["student", "tutor", "admin"], { error: "Invalid role" }),
  password: passwordSchema,
  phoneNumber: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/, "Invalid phone number format").optional(),
});

export const AdminUpdateUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters long").trim().optional(),
  email: z.string().email("Invalid email format").optional(),
  role: z.enum(["student", "tutor", "admin"], { error: "Invalid role" }).optional(),
  password: passwordSchema.optional(),
  phoneNumber: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/, "Invalid phone number format").optional(),
});
