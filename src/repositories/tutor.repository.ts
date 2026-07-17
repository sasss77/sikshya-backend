import { TutorProfileModel } from "../models/tutor-profile.model";
import mongoose from "mongoose";

/**
 * DATABASE LAYER ONLY — no business logic
 */

export const findTutorProfileByUserId = async (userId: string) => {
  return await TutorProfileModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  });
};

export const upsertTutorProfile = async (userId: string, data: Record<string, any>) => {
  return await TutorProfileModel.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId) },
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  );
};

/**
 * Find all tutors with their user info populated.
 * Supports search, filter and sort.
 */
export const findAllTutorProfiles = async (filters: {
  search?: string;
  subject?: string;
  level?: string;
  location?: string;
  maxPrice?: number;
  sortBy?: "rating" | "price_asc" | "price_desc" | "reviews";
}) => {
  const query: Record<string, any> = {};

  if (filters.subject) {
    query.subjects = { $in: [filters.subject] };
  }

  if (filters.level) {
    query.levels = { $in: [filters.level] };
  }

  if (filters.location) {
    query.location = { $regex: filters.location, $options: "i" };
  }

  if (filters.maxPrice) {
    query.hourlyRate = { $lte: filters.maxPrice };
  }

  // Sort config
  let sortConfig: Record<string, 1 | -1> = { averageRating: -1 };
  if (filters.sortBy === "price_asc") sortConfig = { hourlyRate: 1 };
  else if (filters.sortBy === "price_desc") sortConfig = { hourlyRate: -1 };
  else if (filters.sortBy === "reviews") sortConfig = { reviewCount: -1 };

  const profiles = await TutorProfileModel.find(query)
    .populate("userId", "fullName email profileImage")
    .sort(sortConfig)
    .lean();

  // Apply text search (on user's name + tutor's subjects/tags) after populate
  if (filters.search) {
    const term = filters.search.toLowerCase();
    return profiles.filter((p: any) => {
      const name: string = p.userId?.fullName?.toLowerCase() || "";
      const subjectMatch = (p.subjects as string[]).some((s) => s.toLowerCase().includes(term));
      const tagMatch = (p.tags as string[]).some((t) => t.toLowerCase().includes(term));
      return name.includes(term) || subjectMatch || tagMatch;
    });
  }

  return profiles;
};

/* ─── Course Management ────────────────────────────────── */

/** Get all courses for a tutor (returns lean array) */
export const findTutorCourses = async (userId: string) => {
  const profile = await TutorProfileModel.findOne(
    { userId: new mongoose.Types.ObjectId(userId) },
    { courses: 1 }
  ).lean();
  return (profile as any)?.courses || [];
};

/** Push a new course into the tutor's courses array */
export const addCourseToDB = async (userId: string, courseData: Record<string, any>) => {
  return await TutorProfileModel.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId) },
    { $push: { courses: courseData } },
    { new: true, upsert: true }
  );
};

/** Update an existing course by its subdocument _id */
export const updateCourseInDB = async (
  userId: string,
  courseId: string,
  updates: Record<string, any>
) => {
  const setFields: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    setFields[`courses.$.${key}`] = val;
  }
  return await TutorProfileModel.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      "courses._id": new mongoose.Types.ObjectId(courseId),
    },
    { $set: setFields },
    { new: true }
  );
};

/** Remove a course by its subdocument _id */
export const deleteCourseFromDB = async (userId: string, courseId: string) => {
  return await TutorProfileModel.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId) },
    { $pull: { courses: { _id: new mongoose.Types.ObjectId(courseId) } } },
    { new: true }
  );
};

/** Push a module into a specific course */
export const addModuleToCourseInDB = async (
  userId: string,
  courseId: string,
  module: { title: string }
) => {
  return await TutorProfileModel.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      "courses._id": new mongoose.Types.ObjectId(courseId),
    },
    { $push: { "courses.$.modules": module } },
    { new: true }
  );
};

/** Remove a module from a course by index */
export const deleteModuleFromCourseInDB = async (
  userId: string,
  courseId: string,
  moduleIndex: number
) => {
  // MongoDB doesn't support removing by index directly; use 2-step approach
  const profile = await TutorProfileModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!profile) return null;

  const course = (profile.courses as any[]).find(
    (c: any) => c._id.toString() === courseId
  );
  if (!course) return null;

  course.modules.splice(moduleIndex, 1);
  return await profile.save();
};

/** Push a content item into a specific module */
export const addContentToModuleInDB = async (
  userId: string,
  courseId: string,
  moduleIndex: number,
  content: { type: string; title: string; urlOrText: string }
) => {
  const profile = await TutorProfileModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!profile) return null;

  const course = (profile.courses as any[]).find(
    (c: any) => c._id.toString() === courseId
  );
  if (!course || !course.modules[moduleIndex]) return null;

  if (!course.modules[moduleIndex].contents) {
    course.modules[moduleIndex].contents = [];
  }
  course.modules[moduleIndex].contents.push(content);
  return await profile.save();
};

/** Remove a content item from a module by index */
export const deleteContentFromModuleInDB = async (
  userId: string,
  courseId: string,
  moduleIndex: number,
  contentIndex: number
) => {
  const profile = await TutorProfileModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!profile) return null;

  const course = (profile.courses as any[]).find(
    (c: any) => c._id.toString() === courseId
  );
  if (!course || !course.modules[moduleIndex] || !course.modules[moduleIndex].contents) return null;

  course.modules[moduleIndex].contents.splice(contentIndex, 1);
  return await profile.save();
};
