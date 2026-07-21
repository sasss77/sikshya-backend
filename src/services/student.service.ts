import { VerifyStudentSchema } from "../dtos/student.dto";
import { HttpException } from "../exceptions/http-exception";
import {
  createStudentProfile,
  findStudentProfileByUserId,
} from "../repositories/student.repository";
import { findUserById, updateUserById } from "../repositories/user.repository";
import { findBookingsByStudentId } from "../repositories/booking.repository";
import { findEnrollmentsByStudentId } from "../repositories/enrollment.repository";
import { findNotificationsByUserId } from "../repositories/notification.repository";

/**
 * VERIFY STUDENT
 * - Validates input
 * - Prevents double-verification
 * - Ensures caller is a student role
 * - Creates StudentProfile document
 * - Sets User.isVerifiedStudent = true
 */
export const verifyStudent = async (userId: string, data: unknown) => {
  // 1. Validate input
  const validated = VerifyStudentSchema.parse(data);

  // 2. Fetch the user
  const user = await findUserById(userId);
  if (!user) throw new HttpException(404, "User not found");

  // 3. Only students can verify
  if (user.role !== "student") {
    throw new HttpException(403, "Only students can complete student verification");
  }

  // 4. Prevent re-verification
  if (user.isVerifiedStudent) {
    throw new HttpException(400, "Student is already verified");
  }

  // 5. Parse comma-separated subjects into a cleaned array
  const subjects = validated.subjects
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (subjects.length === 0) {
    throw new HttpException(400, "At least one valid subject is required");
  }

  // 6. Create the student profile document
  await createStudentProfile({
    userId,
    institution: validated.institution,
    gradeLevel: validated.gradeLevel as "High School" | "Undergraduate" | "Postgraduate" | "Other",
    subjects,
    bio: validated.bio,
  });

  // 7. Mark user as verified
  const updatedUser = await updateUserById(userId, { isVerifiedStudent: true });

  if (!updatedUser) throw new HttpException(500, "Failed to update user verification status");

  // 8. Return safe response
  return {
    id: updatedUser._id,
    fullName: updatedUser.fullName,
    email: updatedUser.email,
    role: updatedUser.role,
    isVerifiedStudent: updatedUser.isVerifiedStudent,
    verificationDetails: {
      institution: validated.institution,
      gradeLevel: validated.gradeLevel,
      subjects,
      bio: validated.bio,
    },
  };
};

/**
 * GET STUDENT PROFILE
 * Returns the stored academic profile for a verified student.
 */
export const getStudentProfile = async (userId: string) => {
  const profile = await findStudentProfileByUserId(userId);

  if (!profile) {
    throw new HttpException(404, "Student profile not found. Please complete verification first.");
  }

  return {
    institution: profile.institution,
    gradeLevel: profile.gradeLevel,
    subjects: profile.subjects,
    bio: profile.bio,
    verifiedAt: profile.verifiedAt,
  };
};

/**
 * GET STUDENT DASHBOARD
 * Returns aggregated data for the student dashboard.
 */
export const getStudentDashboard = async (userId: string) => {
  const bookings = await findBookingsByStudentId(userId);
  const enrollments = await findEnrollmentsByStudentId(userId);
  const notifications = await findNotificationsByUserId(userId);

  const upcomingBookings = bookings.filter((b: any) => b.status === "upcoming");
  const completedBookings = bookings.filter((b: any) => b.status === "completed");

  const totalHoursLearned = completedBookings.reduce((acc: number, b: any) => {
    // Assuming duration is like "60 min", "90 min"
    const mins = parseInt(b.duration.split(" ")[0]) || 0;
    return acc + (mins / 60);
  }, 0);

  const activeCourses = enrollments.filter((e: any) => e.status !== "completed");

  return {
    stats: {
      upcomingSessions: upcomingBookings.length,
      activeCourses: activeCourses.length,
      sessionsDone: completedBookings.length,
      hoursLearned: totalHoursLearned,
    },
    upcoming: upcomingBookings.slice(0, 5).map((b: any) => ({
      id: b._id,
      tutor: b.tutorId?.fullName || "Unknown",
      initials: (b.tutorId?.fullName || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
      subject: b.subject,
      date: b.day,
      time: b.time,
      duration: b.duration,
      color: "#0B4085" // Mock color
    })),
    inProgress: activeCourses.map((e: any) => ({
      id: e._id,
      subject: e.subject,
      tutor: e.tutorId?.fullName || "Unknown",
      progress: e.progress || 0,
      color: "#0B4085", // Mock color
      modules: e.topics?.filter((t: any) => t.done).length || 0,
      total: e.topics?.length || 0
    })),
    recentActivity: notifications.slice(0, 5).map((n: any) => ({
      id: n._id,
      text: n.title || n.message,
      time: n.createdAt,
      type: n.type
    }))
  };
};

/**
 * GET PUBLIC STUDENT PROFILE
 * Returns the public profile of a student for tutors to view.
 */
export const getPublicStudentProfile = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user || user.role !== "student") {
    throw new HttpException(404, "Student not found");
  }

  const profile = await findStudentProfileByUserId(userId);

  return {
    id: user._id,
    fullName: user.fullName,
    profileImage: user.profileImage || null,
    institution: profile?.institution || "Unknown Institution",
    gradeLevel: profile?.gradeLevel || "Unknown",
    subjects: profile?.subjects || [],
    bio: profile?.bio || "No bio provided.",
    joinedAt: user.createdAt,
  };
};
