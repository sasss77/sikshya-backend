import bcrypt from "bcryptjs";
import { AdminCreateUserSchema, AdminUpdateUserSchema } from "../dtos/admin.user.dto";
import { HttpException } from "../exceptions/http-exception";
import { NotificationModel } from "../models/notification.model";
import { UserModel } from "../models/user.model";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserById,
  deleteUserById,
  findPaginatedUsers
} from "../repositories/user.repository";

export const getAllUsersService = async (page: number, limit: number, search: string) => {
  const result = await findPaginatedUsers(page, limit, search);
  return result;
};

export const getUserByIdService = async (id: string) => {
  const user = await findUserById(id);
  if (!user) throw new HttpException(404, "User not found");
  
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber ?? null,
    profileImage: user.profileImage ?? null,
    createdAt: (user as any).createdAt,
    updatedAt: (user as any).updatedAt,
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


