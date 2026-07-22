import { Request, Response, NextFunction } from "express";
import {
  listTutors,
  getTutorProfile,
  getMyTutorProfile,
  saveTutorProfile,
  getMyCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  addModule,
  deleteModule,
  addModuleContent,
  deleteModuleContent,
} from "../services/tutor.service";
import { getBookedSlotsService } from "../services/admin.user.service";

/**
 * LIST ALL TUTORS
 * GET /api/tutors
 * Public — no auth required
 * Query: search, subject, level, location, maxPrice, sortBy
 */
export const getAllTutors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, subject, level, location, maxPrice, sortBy } = req.query;

    const result = await listTutors({
      search: search ? String(search) : undefined,
      subject: subject ? String(subject) : undefined,
      level: level ? String(level) : undefined,
      location: location ? String(location) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy: sortBy as any,
    });

    res.status(200).json({
      success: true,
      message: "Tutors fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET TUTOR PROFILE BY USER ID
 * GET /api/tutors/:id
 * Public
 */
export const getTutorById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getTutorProfile(String(req.params.id));

    res.status(200).json({
      success: true,
      message: "Tutor profile fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET BOOKED SLOTS FOR A TUTOR
 * GET /api/tutors/:id/booked-slots
 * Public
 */
export const getBookedSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getBookedSlotsService(String(req.params.id));

    res.status(200).json({
      success: true,
      message: "Booked slots fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET MY TUTOR PROFILE
 * GET /api/tutors/my-profile
 * Protected: tutor only
 */
export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const result = await getMyTutorProfile(userId);

    res.status(200).json({
      success: true,
      message: "Tutor profile fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * SAVE / UPDATE TUTOR PROFILE
 * PUT /api/tutors/profile
 * Protected: tutor only
 */
export const saveTutorProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const result = await saveTutorProfile(userId, req.body);

    res.status(200).json({
      success: true,
      message: "Tutor profile saved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/* ─── Course Management Controllers ───────────────────── */

/** GET /api/tutors/courses */
export const getMyCoursesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getMyCourses(req.user!._id.toString());
    res.status(200).json({ success: true, message: "Courses fetched", data: result });
  } catch (error) { next(error); }
};

/** POST /api/tutors/courses */
export const addCourseController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await addCourse(req.user!._id.toString(), req.body);
    res.status(201).json({ success: true, message: "Course added successfully", data: result });
  } catch (error) { next(error); }
};

/** PUT /api/tutors/courses/:courseId */
export const updateCourseController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await updateCourse(req.user!._id.toString(), String(req.params.courseId), req.body);
    res.status(200).json({ success: true, message: "Course updated successfully", data: result });
  } catch (error) { next(error); }
};

/** DELETE /api/tutors/courses/:courseId */
export const deleteCourseController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteCourse(req.user!._id.toString(), String(req.params.courseId));
    res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) { next(error); }
};

/** POST /api/tutors/courses/:courseId/modules */
export const addModuleController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await addModule(req.user!._id.toString(), String(req.params.courseId), req.body);
    res.status(201).json({ success: true, message: "Module added", data: result });
  } catch (error) { next(error); }
};

/** DELETE /api/tutors/courses/:courseId/modules/:moduleIndex */
export const deleteModuleController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deleteModule(
      req.user!._id.toString(),
      String(req.params.courseId),
      parseInt(String(req.params.moduleIndex), 10)
    );
    res.status(200).json({ success: true, message: "Module deleted", data: result });
  } catch (error) { next(error); }
};

/** POST /api/tutors/courses/:courseId/modules/:moduleIndex/contents */
export const addModuleContentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await addModuleContent(
      req.user!._id.toString(),
      String(req.params.courseId),
      parseInt(String(req.params.moduleIndex), 10),
      req.body
    );
    res.status(201).json({ success: true, message: "Content added", data: result });
  } catch (error) { next(error); }
};

/** DELETE /api/tutors/courses/:courseId/modules/:moduleIndex/contents/:contentIndex */
export const deleteModuleContentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deleteModuleContent(
      req.user!._id.toString(),
      String(req.params.courseId),
      parseInt(String(req.params.moduleIndex), 10),
      parseInt(String(req.params.contentIndex), 10)
    );
    res.status(200).json({ success: true, message: "Content deleted", data: result });
  } catch (error) { next(error); }
};

/** POST /api/tutors/upload-content */
export const uploadCourseContentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const fileUrl = `/uploads/courses/${req.file.filename}`;
    res.status(200).json({ success: true, message: "File uploaded successfully", url: fileUrl });
  } catch (error) { next(error); }
};
