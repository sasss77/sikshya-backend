import { HttpException } from "../exceptions/http-exception";
import {
  createEnrollment,
  findEnrollmentsByStudentId,
  findEnrollmentById,
  findEnrollmentByCourse,
  updateEnrollmentTopic,
  toggleModuleCompleted,
} from "../repositories/enrollment.repository";
import { findTutorProfileByUserId } from "../repositories/tutor.repository";
import { findUserById } from "../repositories/user.repository";

/**
 * AUTO-CREATE ENROLLMENT FROM A BOOKING
 * Called internally by booking.service when a booking is created.
 * Topics are seeded from the tutor's course matching the booked subject or courseId.
 */
export const createEnrollmentFromBooking = async (booking: any) => {
  const tutorId = (booking.tutorId as any)?._id?.toString() ?? booking.tutorId.toString();

  // Fetch tutor profile to get course topics
  const tutorProfile = await findTutorProfileByUserId(tutorId);

  // Try to find a matching course for the booked subject or courseId
  let topics: { label: string; done: boolean }[] = [];
  let courseId: string | undefined;

  if (tutorProfile && tutorProfile.courses.length > 0) {
    let matchedCourse;

    if (booking.courseId) {
      matchedCourse = tutorProfile.courses.find(
        (c: any) => c._id?.toString() === booking.courseId?.toString()
      );
      if (matchedCourse) courseId = matchedCourse._id?.toString();
    }

    if (!matchedCourse) {
      matchedCourse =
        tutorProfile.courses.find(
          (c) =>
            c.title.toLowerCase().includes(booking.subject.toLowerCase()) ||
            booking.subject.toLowerCase().includes(c.level.toLowerCase())
        ) ?? tutorProfile.courses[0];
      if (matchedCourse) courseId = (matchedCourse as any)._id?.toString();
    }

    topics = (matchedCourse?.modules ?? []).map((m: any) => ({
      label: typeof m === "string" ? m : m.title,
      done: false,
    }));
  }

  // Default topic if none found
  if (topics.length === 0) {
    topics = [{ label: `${booking.subject} Session 1`, done: false }];
  }

  const studentId = (booking.studentId as any)?._id?.toString() ?? booking.studentId.toString();

  // Check if student is already enrolled in this course (avoid duplicates)
  if (courseId) {
    const existing = await findEnrollmentByCourse(studentId, courseId);
    if (existing) return existing; // Already enrolled
  }

  await createEnrollment({
    studentId,
    tutorId,
    bookingId: booking._id.toString(),
    courseId,
    subject: booking.subject,
    totalSessions: 1,
    nextSession: `${booking.day} at ${booking.time}`,
    topics,
  });
};

/**
 * ADD COURSE TO LEARNINGS (Manual)
 * Called when a student clicks "Add to My Learnings" on a tutor's profile.
 */
export const addCourseToLearnings = async (
  studentId: string,
  tutorId: string,
  courseId: string
) => {
  // Validate tutor
  const tutor = await findUserById(tutorId);
  if (!tutor || tutor.role !== "tutor") {
    throw new HttpException(404, "Tutor not found");
  }

  const tutorProfile = await findTutorProfileByUserId(tutorId);
  if (!tutorProfile) {
    throw new HttpException(400, "Tutor has no profile yet");
  }

  const course = tutorProfile.courses.find(
    (c: any) => c._id?.toString() === courseId
  );
  if (!course) {
    throw new HttpException(404, "Course not found");
  }

  // Check for existing enrollment
  const existing = await findEnrollmentByCourse(studentId, courseId);
  if (existing) {
    throw new HttpException(409, "You have already added this course to your learnings");
  }

  // Seed topics from modules
  const topics = (course.modules ?? []).map((m: any) => ({
    label: typeof m === "string" ? m : m.title,
    done: false,
  }));

  const enrollment = await createEnrollment({
    studentId,
    tutorId,
    courseId,
    subject: course.title,
    totalSessions: 0,
    nextSession: null,
    topics,
  });

  return {
    id: enrollment._id,
    subject: course.title,
    tutorName: tutor.fullName,
    progress: 0,
    status: "not_started",
  };
};

/**
 * GET MY LEARNINGS
 * Returns all enrollments (learning records) for the logged-in student.
 */
export const getMyLearnings = async (userId: string) => {
  const enrollments = await findEnrollmentsByStudentId(userId);

  return enrollments.map((e: any) => {
    const tutor = e.tutorId;
    const totalModules = e.topics?.length || 0;
    return {
      id: e._id,
      courseId: e.courseId,
      subject: e.subject,
      tutorId: tutor?._id || e.tutorId,
      tutorName: tutor?.fullName || "Unknown Tutor",
      tutorImage: tutor?.profileImage || null,
      totalSessions: e.totalSessions,
      completedSessions: e.completedSessions,
      progress: e.progress,
      nextSession: e.nextSession,
      status: e.status,
      topics: e.topics,
      completedModules: e.completedModules || [],
      totalModules,
    };
  });
};

/**
 * GET ENROLLMENT DETAIL (with full course content)
 * Returns the enrollment + the tutor's full course modules with contents.
 */
export const getEnrollmentDetail = async (enrollmentId: string, studentId: string) => {
  const enrollment = await findEnrollmentById(enrollmentId);
  if (!enrollment) throw new HttpException(404, "Enrollment not found");

  const enroll = enrollment as any;
  if (enroll.studentId?.toString() !== studentId) {
    throw new HttpException(403, "Not authorized to view this enrollment");
  }

  const tutorId = enroll.tutorId?._id?.toString() ?? enroll.tutorId?.toString();
  const tutorProfile = await findTutorProfileByUserId(tutorId);

  let courseData: any = null;
  if (tutorProfile && enroll.courseId) {
    courseData = tutorProfile.courses.find(
      (c: any) => c._id?.toString() === enroll.courseId?.toString()
    );
  }

  const tutor = enroll.tutorId;
  return {
    id: enroll._id,
    courseId: enroll.courseId,
    subject: enroll.subject,
    tutorId: tutor?._id,
    tutorName: tutor?.fullName || "Unknown Tutor",
    tutorEmail: tutor?.email || null,
    tutorPhone: tutor?.phoneNumber || null,
    tutorImage: tutor?.profileImage || null,
    tutorBio: tutorProfile?.bio || null,
    tutorLocation: tutorProfile?.location || null,
    tutorSubjects: tutorProfile?.subjects || [],
    tutorRating: tutorProfile?.averageRating || 0,
    tutorReviewCount: tutorProfile?.reviewCount || 0,
    progress: enroll.progress,
    status: enroll.status,
    completedModules: enroll.completedModules || [],
    topics: enroll.topics || [],
    nextSession: enroll.nextSession,
    totalSessions: enroll.totalSessions,
    // Full course modules with contents for reading
    courseModules: courseData?.modules ?? [],
    courseTitle: courseData?.title ?? enroll.subject,
    courseLevel: courseData?.level ?? "",
    coursePrice: courseData?.price ?? 0,
  };
};

/**
 * MARK MODULE AS READ / UNREAD
 * Toggles a module in the student's completedModules list.
 */
export const markModuleRead = async (
  enrollmentId: string,
  moduleTitle: string,
  studentId: string,
  totalModules: number
) => {
  const enrollment = await findEnrollmentById(enrollmentId);
  if (!enrollment) throw new HttpException(404, "Enrollment not found");

  const enroll = enrollment as any;
  if (enroll.studentId?.toString() !== studentId) {
    throw new HttpException(403, "Not authorized");
  }

  const updated = await toggleModuleCompleted(enrollmentId, moduleTitle, totalModules);
  if (!updated) throw new HttpException(500, "Failed to update module");

  return {
    id: updated._id,
    progress: updated.progress,
    status: updated.status,
    completedModules: (updated as any).completedModules,
  };
};

/**
 * TOGGLE TOPIC DONE
 * Student can mark a topic as done/undone.
 */
export const toggleTopic = async (
  enrollmentId: string,
  topicIndex: number,
  done: boolean,
  studentId: string
) => {
  const enrollments = await findEnrollmentsByStudentId(studentId);
  const enrollment = enrollments.find((e: any) => e._id.toString() === enrollmentId);

  if (!enrollment) {
    throw new HttpException(404, "Enrollment not found");
  }

  const updated = await updateEnrollmentTopic(enrollmentId, topicIndex, done);
  if (!updated) throw new HttpException(500, "Failed to update topic");

  return {
    id: updated._id,
    subject: updated.subject,
    progress: updated.progress,
    status: updated.status,
    topics: updated.topics,
  };
};
