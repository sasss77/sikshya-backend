import bcrypt from "bcryptjs";
import { AdminCreateUserSchema, AdminUpdateUserSchema } from "../dtos/admin.user.dto";
import { HttpException } from "../exceptions/http-exception";
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
