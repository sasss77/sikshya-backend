import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SignupSchema, LoginSchema, UpdateProfileSchema } from "../dtos/user.dto";
import { HttpException } from "../exceptions/http-exception";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserById,
} from "../repositories/user.repository";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"];

/**
 * REGISTER USER
 */
export const registerUser = async (data: unknown) => {
  // 1. Validate input
  const validatedData = SignupSchema.parse(data);

  const { fullName, email, role, password, phoneNumber } = validatedData;

  // 2. Check if user exists (via repository)
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new HttpException(400, "Email already exists");
  }

  // 3. Hash password (business logic layer)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 4. Create user via repository
  const user = await createUser({
    fullName,
    email,
    role,
    password: hashedPassword,
    ...(phoneNumber && { phoneNumber }),
  });

  // 5. Return safe response
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber ?? null,
  };
};

/**
 * LOGIN USER
 */
export const loginUser = async (data: unknown) => {
  // 1. Validate input
  const validatedData = LoginSchema.parse(data);

  const { email, password } = validatedData;

  // 2. Find user via repository
  const user = await findUserByEmail(email);

  if (!user) {
    throw new HttpException(404, "User not found");
  }

  // 3. Compare password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new HttpException(401, "Invalid credentials");
  }

  // 4. Generate JWT
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // 5. Return response
  return {
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber ?? null,
      profileImage: user.profileImage ?? null,
    },
  };
};

/**
 * WHO AM I — Get logged-in user's profile
 */
export const getMyProfile = async (userId: string) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new HttpException(404, "User not found");
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
  };
};

/**
 * UPDATE PROFILE — Update allowed user fields
 */
export const updateMyProfile = async (
  userId: string,
  data: unknown,
  profileImagePath?: string
) => {
  // 1. Validate body fields
  const validatedData = UpdateProfileSchema.parse(data);

  const { fullName, phoneNumber, password } = validatedData;

  // 2. Build update payload
  const updatePayload: Record<string, any> = {};

  if (fullName) updatePayload.fullName = fullName;
  if (phoneNumber) updatePayload.phoneNumber = phoneNumber;

  // 3. Hash new password if provided
  if (password) {
    const salt = await bcrypt.genSalt(10);
    updatePayload.password = await bcrypt.hash(password, salt);
  }

  // 4. Attach profile image path if uploaded
  if (profileImagePath) {
    updatePayload.profileImage = profileImagePath;
  }

  // 5. Ensure there is something to update
  if (Object.keys(updatePayload).length === 0) {
    throw new HttpException(400, "No valid fields provided to update");
  }

  // 6. Persist via repository
  const updatedUser = await updateUserById(userId, updatePayload);

  if (!updatedUser) {
    throw new HttpException(404, "User not found");
  }

  // 7. Return safe response (never return password)
  return {
    id: updatedUser._id,
    fullName: updatedUser.fullName,
    email: updatedUser.email,
    role: updatedUser.role,
    phoneNumber: updatedUser.phoneNumber ?? null,
    profileImage: updatedUser.profileImage ?? null,
    updatedAt: (updatedUser as any).updatedAt,
  };
};