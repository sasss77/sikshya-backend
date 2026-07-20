import { z } from "zod";

const VALID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const VALID_STATUSES = ["upcoming", "completed", "cancelled"] as const;

/**
 * CREATE BOOKING DTO
 */
export const CreateBookingSchema = z.object({
  tutorId: z.string().min(1, "Tutor ID is required"),

  subject: z.string().min(1, "Subject is required").trim(),

  day: z.enum(VALID_DAYS, {
    error: "Day must be one of Mon, Tue, Wed, Thu, Fri, Sat, Sun",
  }),

  time: z.string().min(1, "Time is required"),

  duration: z.string().default("60 min"),

  notes: z.string().trim().optional(),

  courseId: z.string().optional(),
});

/**
 * UPDATE BOOKING STATUS DTO
 * Used by tutor to accept/decline, or student to cancel
 */
export const UpdateBookingStatusSchema = z.object({
  status: z.enum(VALID_STATUSES, {
    error: "Status must be upcoming, completed, or cancelled",
  }),
  cancelReason: z.string().trim().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>;
