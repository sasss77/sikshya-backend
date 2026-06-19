import { z } from "zod";

/**
 * Password rules:
 * - min 8 chars
 * - 1 uppercase
 * - 1 lowercase
 * - 1 number
 * - 1 special character
 */
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

/**
 * SIGNUP DTO
 */
export const SignupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters long")
    .trim(),

  email: z.string().email("Invalid email format"),

  role: z.enum(["student", "tutor"], {
    error: "Role must be student or tutor",
  }),

  password: passwordSchema,
});

/**
 * LOGIN DTO
 */
export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),

  password: z.string().min(1, "Password is required"),
});

/**
 * UPDATE PROFILE DTO
 * All fields optional — user can update any subset
 */
export const UpdateProfileSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters long")
      .trim()
      .optional(),

    phoneNumber: z
      .string()
      .regex(/^\+?[0-9\s\-()]{7,15}$/, "Invalid phone number format")
      .optional(),

    password: passwordSchema.optional(),

    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password || data.confirmPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    { message: "Passwords do not match", path: ["confirmPassword"] }
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });