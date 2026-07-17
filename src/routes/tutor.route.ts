import { Router } from "express";
import {
  getAllTutors,
  getTutorById,
  getMyProfile,
  saveTutorProfileController,
  getMyCoursesController,
  addCourseController,
  updateCourseController,
  deleteCourseController,
  addModuleController,
  deleteModuleController,
  addModuleContentController,
  deleteModuleContentController,
  uploadCourseContentController,
} from "../controllers/tutor.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { uploadCourseContent } from "../middlewares/upload.middleware";

const router = Router();

/**
 * LIST ALL TUTORS
 * GET /api/tutors
 * Public — supports ?search=&subject=&level=&location=&maxPrice=&sortBy=
 */
router.get("/", getAllTutors);

/**
 * GET MY TUTOR PROFILE (authenticated)
 * GET /api/tutors/my-profile
 */
router.get("/my-profile", authorizedMiddleware, getMyProfile);

/**
 * SAVE / UPDATE TUTOR PROFILE
 * PUT /api/tutors/profile
 */
router.put("/profile", authorizedMiddleware, saveTutorProfileController);

/* ─── Course Management Routes ─────────────────────────── */

/** GET    /api/tutors/courses              — list my courses */
router.get("/courses", authorizedMiddleware, getMyCoursesController);

/** POST   /api/tutors/courses              — add a course */
router.post("/courses", authorizedMiddleware, addCourseController);

/** PUT    /api/tutors/courses/:courseId    — edit a course */
router.put("/courses/:courseId", authorizedMiddleware, updateCourseController);

/** DELETE /api/tutors/courses/:courseId    — delete a course */
router.delete("/courses/:courseId", authorizedMiddleware, deleteCourseController);

/** POST   /api/tutors/courses/:courseId/modules             — add module */
router.post("/courses/:courseId/modules", authorizedMiddleware, addModuleController);

/** DELETE /api/tutors/courses/:courseId/modules/:moduleIndex — delete module by index */
router.delete("/courses/:courseId/modules/:moduleIndex", authorizedMiddleware, deleteModuleController);

/** POST   /api/tutors/courses/:courseId/modules/:moduleIndex/contents — add content to module */
router.post("/courses/:courseId/modules/:moduleIndex/contents", authorizedMiddleware, addModuleContentController);

/** DELETE /api/tutors/courses/:courseId/modules/:moduleIndex/contents/:contentIndex — delete content */
router.delete("/courses/:courseId/modules/:moduleIndex/contents/:contentIndex", authorizedMiddleware, deleteModuleContentController);

/** POST /api/tutors/upload-content — upload file */
router.post("/upload-content", authorizedMiddleware, uploadCourseContent, uploadCourseContentController);

/**
 * GET A SPECIFIC TUTOR'S PUBLIC PROFILE
 * GET /api/tutors/:id
 * IMPORTANT: Must stay LAST to avoid route conflicts
 */
router.get("/:id", getTutorById);

export default router;

