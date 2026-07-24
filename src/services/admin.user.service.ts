import bcrypt from "bcryptjs";
import { AdminCreateUserSchema, AdminUpdateUserSchema } from "../dtos/admin.user.dto";
import { HttpException } from "../exceptions/http-exception";
import { NotificationModel } from "../models/notification.model";
import { StudentProfileModel } from "../models/student-profile.model";
import { TutorProfileModel } from "../models/tutor-profile.model";
import { EnrollmentModel } from "../models/enrollment.model";
import { BookingModel } from "../models/booking.model";
import { UserModel } from "../models/user.model";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserById,
  deleteUserById,
  findPaginatedUsers
} from "../repositories/user.repository";

export const getAllUsersService = async (page: number, limit: number, search: string, role?: string) => {
  const result = await findPaginatedUsers(page, limit, search, role);
  
  // Attach profiles for tutors
  const tutorIds = result.data.filter(u => u.role === "tutor").map(u => u.id);
  if (tutorIds.length > 0) {
    const profiles = await TutorProfileModel.find({ userId: { $in: tutorIds } }).lean();
    const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));
    
    result.data = result.data.map(u => {
      if (u.role === "tutor") {
        return {
          ...u,
          profile: profileMap.get(u.id.toString()) || null
        };
      }
      return u;
    });
  }

  return result;
};

export const getUserByIdService = async (id: string) => {
  const user = await findUserById(id);
  if (!user) throw new HttpException(404, "User not found");
  let details: any = null;

  if (user.role === "student") {
    const profile = await StudentProfileModel.findOne({ userId: id }).lean();
    const enrollments = await EnrollmentModel.find({ studentId: id }).lean();
    
    const enrolledCourseIds = enrollments.map(e => e.courseId).filter(Boolean);
    const appointedTeacherIds = [...new Set(enrollments.map(e => e.tutorId.toString()))].filter(Boolean);
    const totalSessionsAttended = enrollments.reduce((acc, curr) => acc + (curr.completedSessions || 0), 0);

    details = {
      profile,
      enrolledCoursesCount: enrolledCourseIds.length,
      appointedTeachersCount: appointedTeacherIds.length,
      totalSessionsAttended,
    };
  } else if (user.role === "tutor") {
    const profile = await TutorProfileModel.findOne({ userId: id }).lean();
    const enrollments = await EnrollmentModel.find({ tutorId: id }).lean();

    const totalStudentsTaught = new Set(enrollments.map(e => e.studentId.toString())).size;
    const totalClassesAttended = enrollments.reduce((acc, curr) => acc + (curr.completedSessions || 0), 0);
    const totalCourses = profile?.courses?.length || 0;

    details = {
      profile,
      totalStudentsTaught,
      totalClassesAttended,
      totalCourses,
    };
  }

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber ?? null,
    profileImage: user.profileImage ?? null,
    createdAt: (user as any).createdAt,
    updatedAt: (user as any).updatedAt,
    details,
  };
};

export const createUserService = async (data: unknown) => {
  const validatedData = AdminCreateUserSchema.parse(data);
  const existingUser = await findUserByEmail(validatedData.email);
  if (existingUser) throw new HttpException(400, "Email already exists");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(validatedData.password, salt);

  const user = await createUser({
    ...validatedData,
    password: hashedPassword,
  });

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber ?? null,
  };
};

export const updateUserService = async (id: string, data: unknown) => {
  const validatedData = AdminUpdateUserSchema.parse(data);
  const user = await findUserById(id);
  if (!user) throw new HttpException(404, "User not found");

  if (validatedData.email && validatedData.email !== user.email) {
    const existing = await findUserByEmail(validatedData.email);
    if (existing) throw new HttpException(400, "Email already in use");
  }

  const updatePayload: Record<string, any> = { ...validatedData };
  if (updatePayload.password) {
    const salt = await bcrypt.genSalt(10);
    updatePayload.password = await bcrypt.hash(updatePayload.password, salt);
  }

  const updatedUser = await updateUserById(id, updatePayload);
  if (!updatedUser) throw new HttpException(404, "Failed to update user");

  return {
    id: updatedUser._id,
    fullName: updatedUser.fullName,
    email: updatedUser.email,
    role: updatedUser.role,
    phoneNumber: updatedUser.phoneNumber ?? null,
  };
};

export const deleteUserService = async (id: string) => {
  const user = await findUserById(id);
  if (!user) throw new HttpException(404, "User not found");
  await deleteUserById(id);
  return null;
};

export const getAdminStatsService = async () => {
  const [totalUsers, totalStudents, totalTutors, totalAdmins, recentUsers] = await Promise.all([
    UserModel.countDocuments(),
    UserModel.countDocuments({ role: "student" }),
    UserModel.countDocuments({ role: "tutor" }),
    UserModel.countDocuments({ role: "admin" }),
    UserModel.find().sort({ createdAt: -1 }).limit(5).select("fullName email role createdAt"),
  ]);

  // Count signups in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newUsersThisMonth = await UserModel.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  return {
    totalUsers,
    totalStudents,
    totalTutors,
    totalAdmins,
    newUsersThisMonth,
    recentUsers: recentUsers.map((u: any) => ({
      id: u._id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    })),
  };
};

export const sendAdminNotificationService = async (audience: string, title: string, message: string) => {
  let query: any = {};
  if (audience === "students") {
    query.role = "student";
  } else if (audience === "tutors") {
    query.role = "tutor";
  } else if (audience !== "all") {
    // If it's a specific user ID
    query._id = audience;
  }

  const users = await UserModel.find(query).select("_id");
  if (users.length === 0) {
    throw new HttpException(404, "No users found matching the audience");
  }

  const notifications = users.map(user => ({
    userId: user._id,
    type: "system",
    title,
    message,
    read: false,
  }));

  await NotificationModel.insertMany(notifications);
};

export const getAdminRequestsService = async () => {
  const users = await UserModel.find({ role: "admin", isVerifiedAdmin: false })
    .select("_id fullName email createdAt")
    .sort({ createdAt: -1 });
  
  return users.map(u => ({
    id: u._id,
    fullName: u.fullName,
    email: u.email,
    createdAt: u.createdAt,
  }));
};

export const verifyAdminService = async (id: string) => {
  const user = await UserModel.findById(id);
  if (!user) throw new HttpException(404, "User not found");
  if (user.role !== "admin") throw new HttpException(400, "User is not an admin");
  
  user.isVerifiedAdmin = true;
  await user.save();
};

/**
 * GET ALL COURSES (Admin)
 * Returns all courses from all tutor profiles with tutor info.
 */
export const getAllCoursesService = async () => {
  const profiles = await TutorProfileModel.find(
    { "courses.0": { $exists: true } },
    { userId: 1, courses: 1 }
  ).populate("userId", "fullName email profileImage").lean();

  const result: any[] = [];
  for (const profile of profiles as any[]) {
    const tutor = profile.userId;
    for (const course of profile.courses || []) {
      result.push({
        id: course._id,
        title: course.title,
        level: course.level,
        price: course.price,
        modulesCount: (course.modules || []).length,
        tutorId: tutor?._id,
        tutorName: tutor?.fullName || "Unknown",
        tutorEmail: tutor?.email || "",
        tutorImage: tutor?.profileImage || null,
      });
    }
  }
  return result;
};

/**
 * GET A SINGLE COURSE BY ID (Admin)
 */
export const getAdminCourseByIdService = async (courseId: string) => {
  const profile = await TutorProfileModel.findOne(
    { "courses._id": courseId },
    { userId: 1, "courses.$": 1 }
  ).populate("userId", "fullName email profileImage").lean();

  if (!profile || !profile.courses || profile.courses.length === 0) {
    throw new HttpException(404, "Course not found");
  }

  const tutor = profile.userId as any;
  const course = profile.courses[0];

  return {
    id: course._id,
    title: course.title,
    level: course.level,
    price: course.price,
    modules: course.modules || [],
    tutorId: tutor?._id,
    tutorName: tutor?.fullName || "Unknown",
    tutorEmail: tutor?.email || "",
    tutorImage: tutor?.profileImage || null,
  };
};

/**
 * GET BOOKED SLOTS FOR A TUTOR
 * Returns day+time pairs that are already booked (pending or upcoming).
 * Used by the frontend to grey out unavailable time slots.
 */
export const getBookedSlotsService = async (tutorId: string) => {
  const bookings = await BookingModel.find(
    { tutorId, status: { $in: ["pending", "upcoming"] } },
    { day: 1, time: 1 }
  ).lean();

  return bookings.map((b: any) => ({ day: b.day, time: b.time }));
};
