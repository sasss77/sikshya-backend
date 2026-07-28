import { z } from "zod";
import { TutorProfileSchema } from "../dtos/tutor.dto";
import { HttpException } from "../exceptions/http-exception";
import {
  findAllTutorProfiles,
  findTutorProfileByUserId,
  upsertTutorProfile,
  findTutorCourses,
  addCourseToDB,
  updateCourseInDB,
  deleteCourseFromDB,
  addModuleToCourseInDB,
  deleteModuleFromCourseInDB,
  addContentToModuleInDB,
  deleteContentFromModuleInDB,
} from "../repositories/tutor.repository";
import { findUserById } from "../repositories/user.repository";

/**
 * Helper to format a raw tutor profile + populated user into a clean response shape.
 */
const formatProfile = (profile: any) => {
  const user = profile.userId || {};
  return {
    id: user._id || profile.userId,
    userId: user._id || profile.userId,
    name: user.fullName,
    email: user.email,
    profileImage: user.profileImage || null,
    bio: profile.bio,
    institution: profile.institution,
    experience: profile.experience,
    location: profile.location,
    languages: profile.languages,
    subjects: profile.subjects,
    levels: profile.levels,
    sessionTypes: profile.sessionTypes,
    hourlyRate: profile.hourlyRate,
    availDays: profile.availDays,
    tags: profile.tags,
    achievements: profile.achievements,
    courses: profile.courses,
    averageRating: profile.averageRating,
    reviewCount: profile.reviewCount,
  };
};

/**
 * LIST ALL TUTORS
 * Public — no auth required
 */
export const listTutors = async (filters: {
  search?: string;
  subject?: string;
  level?: string;
  location?: string;
  maxPrice?: number;
  sortBy?: "rating" | "price_asc" | "price_desc" | "reviews";
}) => {
  const profiles = await findAllTutorProfiles(filters);
  return profiles.map(formatProfile);
};

/**
 * GET TUTOR PROFILE BY USER ID
 * Public
 */
export const getTutorProfile = async (userId: string) => {
  const profile = await findTutorProfileByUserId(userId);

  if (!profile) {
    throw new HttpException(404, "Tutor profile not found");
  }

  const populated = await profile.populate("userId", "fullName email profileImage");
  return formatProfile(populated);
};

/**
 * GET MY OWN TUTOR PROFILE
 * Authenticated — tutor only
 */
export const getMyTutorProfile = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user || user.role !== "tutor") {
    throw new HttpException(403, "Only tutors can access this endpoint");
  }

  const profile = await findTutorProfileByUserId(userId);
  if (!profile) {
    // Return empty profile structure so the frontend form can pre-fill defaults
    return {
      userId,
      bio: "", institution: "", experience: "", location: "",
      languages: ["Nepali"], subjects: [], levels: [], sessionTypes: [],
      hourlyRate: 0, availDays: [], tags: [], achievements: [], courses: [],
      averageRating: 0, reviewCount: 0,
    };
  }

  const populated = await profile.populate("userId", "fullName email profileImage");
  return formatProfile(populated);
};

/**
 * UPSERT TUTOR PROFILE
 * Authenticated — tutor only
 */
export const saveTutorProfile = async (userId: string, data: unknown) => {
  const user = await findUserById(userId);
  if (!user || user.role !== "tutor") {
    throw new HttpException(403, "Only tutors can update a tutor profile");
  }

  const validated = TutorProfileSchema.parse(data);
  const updated = await upsertTutorProfile(userId, validated);

  if (!updated) {
    throw new HttpException(500, "Failed to save tutor profile");
  }

  const populated = await updated.populate("userId", "fullName email profileImage");
  return formatProfile(populated);
};

/* ─── Course Management Services ──────────────────────── */

/** Validate tutor role helper */
const assertTutor = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user || user.role !== "tutor") {
    throw new HttpException(403, "Only tutors can manage courses");
  }
};

/** GET all courses for the authenticated tutor */
export const getMyCourses = async (userId: string) => {
  await assertTutor(userId);
  return await findTutorCourses(userId);
};

/** ADD a new course */
export const addCourse = async (userId: string, data: unknown) => {
  await assertTutor(userId);
  const schema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    subject: z.string().optional(),
    level: z.string().min(1, "Level is required"),
    price: z.coerce.number().min(0),
    color: z.string().optional(),
    modules: z.array(z.object({ title: z.string().min(1) })).default([]),
  });
  const validated = schema.parse(data);
  const profile = await addCourseToDB(userId, validated);
  if (!profile) throw new HttpException(500, "Failed to add course");
  return (profile.courses as any[]).at(-1);
};

/** UPDATE an existing course */
export const updateCourse = async (userId: string, courseId: string, data: unknown) => {
  await assertTutor(userId);
  const schema = z.object({
    title: z.string().min(2).optional(),
    subject: z.string().optional(),
    level: z.string().optional(),
    price: z.coerce.number().min(0).optional(),
    color: z.string().optional(),
    modules: z.array(z.object({ title: z.string().min(1) })).optional(),
  });
  const validated = schema.parse(data);
  const profile = await updateCourseInDB(userId, courseId, validated);
  if (!profile) throw new HttpException(404, "Course not found");
  return (profile.courses as any[]).find((c: any) => c._id.toString() === courseId);
};

/** DELETE a course */
export const deleteCourse = async (userId: string, courseId: string) => {
  await assertTutor(userId);
  const profile = await deleteCourseFromDB(userId, courseId);
  if (!profile) throw new HttpException(404, "Course not found");
  return { deleted: true };
};

/** ADD a module to a course */
export const addModule = async (userId: string, courseId: string, data: unknown) => {
  await assertTutor(userId);
  const schema = z.object({ title: z.string().min(1, "Module title is required") });
  const validated = schema.parse(data);
  const profile = await addModuleToCourseInDB(userId, courseId, validated);
  if (!profile) throw new HttpException(404, "Course not found");
  const course = (profile.courses as any[]).find((c: any) => c._id.toString() === courseId);
  return course?.modules || [];
};

/** DELETE a module from a course by index */
export const deleteModule = async (userId: string, courseId: string, moduleIndex: number) => {
  await assertTutor(userId);
  if (isNaN(moduleIndex) || moduleIndex < 0) {
    throw new HttpException(400, "Invalid module index");
  }
  const profile = await deleteModuleFromCourseInDB(userId, courseId, moduleIndex);
  if (!profile) throw new HttpException(404, "Course not found");
  const course = (profile.courses as any[]).find((c: any) => c._id.toString() === courseId);
  return course?.modules || [];
};

/** ADD content to a module */
export const addModuleContent = async (
  userId: string,
  courseId: string,
  moduleIndex: number,
  data: unknown
) => {
  await assertTutor(userId);
  if (isNaN(moduleIndex) || moduleIndex < 0) {
    throw new HttpException(400, "Invalid module index");
  }
  const schema = z.object({
    type: z.enum(["pdf", "video", "text", "file"]),
    title: z.string().min(1, "Title is required"),
    urlOrText: z.string().min(1, "Content is required"),
  });
  const validated = schema.parse(data);
  const profile = await addContentToModuleInDB(userId, courseId, moduleIndex, validated);
  if (!profile) throw new HttpException(404, "Course or module not found");
  
  const course = (profile.courses as any[]).find((c: any) => c._id.toString() === courseId);
  return course?.modules || [];
};

/** DELETE content from a module */
export const deleteModuleContent = async (
  userId: string,
  courseId: string,
  moduleIndex: number,
  contentIndex: number
) => {
  await assertTutor(userId);
  if (isNaN(moduleIndex) || moduleIndex < 0 || isNaN(contentIndex) || contentIndex < 0) {
    throw new HttpException(400, "Invalid module or content index");
  }
  const profile = await deleteContentFromModuleInDB(userId, courseId, moduleIndex, contentIndex);
  if (!profile) throw new HttpException(404, "Course, module, or content not found");
  
  const course = (profile.courses as any[]).find((c: any) => c._id.toString() === courseId);
  return course?.modules || [];
};
