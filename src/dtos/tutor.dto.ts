import { z } from "zod";

const CourseModuleSchema = z.object({
  title: z.string().min(1, "Module title is required").trim(),
});

const CourseSchema = z.object({
  title: z.string().min(2, "Course title must be at least 2 characters").trim(),
  level: z.string().min(1, "Level is required"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  modules: z.array(CourseModuleSchema).default([]),
});

/**
 * TUTOR PROFILE UPSERT DTO
 * All fields optional — tutor can update any subset
 */
export const TutorProfileSchema = z.object({
  bio: z.string().trim().optional(),
  institution: z.string().trim().optional(),
  experience: z.string().optional(),
  location: z.string().trim().optional(),
  languages: z.array(z.string().trim()).optional(),
  subjects: z.array(z.string().trim()).optional(),
  levels: z.array(z.string().trim()).optional(),
  sessionTypes: z.array(z.string().trim()).optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  availDays: z.array(z.string().trim()).optional(),
  tags: z.array(z.string().trim()).optional(),
  achievements: z.array(z.string().trim()).optional(),
  courses: z.array(CourseSchema).optional(),
});

export type TutorProfileInput = z.infer<typeof TutorProfileSchema>;
