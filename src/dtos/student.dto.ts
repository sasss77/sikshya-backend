import { z } from "zod";

/**
 * VERIFY STUDENT DTO
 * Validates the body sent to POST /api/students/verify
 */
export const VerifyStudentSchema = z.object({
  institution: z
    .string()
    .min(2, "Institution name must be at least 2 characters")
    .trim(),

  gradeLevel: z.enum(["High School", "Undergraduate", "Postgraduate", "Other"], {
    error: "Grade level must be one of: High School, Undergraduate, Postgraduate, Other",
  }),

  /**
   * Comma-separated subject string from the frontend.
   * e.g. "Physics, Math, Biology"
   * We validate the raw string here; parsing into array happens in the service.
   */
  subjects: z
    .string()
    .min(1, "At least one subject is required")
    .trim(),

  bio: z
    .string()
    .min(10, "Bio must be at least 10 characters")
    .trim(),
});

export type VerifyStudentInput = z.infer<typeof VerifyStudentSchema>;
