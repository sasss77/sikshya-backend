import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
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
  const isDefaultAdmin = email === process.env.ADMIN_EMAIL && role === "admin";
  
  const user = await createUser({
    fullName,
    email,
    role,
    password: hashedPassword,
    ...(isDefaultAdmin && { isVerifiedAdmin: true }),
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
      isVerifiedAdmin: user.email === process.env.ADMIN_EMAIL ? true : (user.isVerifiedAdmin ?? false),
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
    isVerifiedStudent: user.isVerifiedStudent ?? false,
    isVerifiedAdmin: user.email === process.env.ADMIN_EMAIL ? true : (user.isVerifiedAdmin ?? false),
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

  const { fullName, phoneNumber, password, oldPassword } = validatedData;

  // 2. Build update payload
  const updatePayload: Record<string, any> = {};

  if (fullName) updatePayload.fullName = fullName;
  if (phoneNumber) updatePayload.phoneNumber = phoneNumber;

  // 3. Hash new password if provided
  if (password && oldPassword) {
    const user = await findUserById(userId);
    if (!user) {
      throw new HttpException(404, "User not found");
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new HttpException(400, "Current password is incorrect");
    }
    
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

/**
 * GOOGLE LOGIN
 */
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLoginUser = async (accessToken: string) => {
  // 1. Fetch user info using the access token from Google's userinfo endpoint
  let googleUserInfo: { email?: string; name?: string; sub?: string; picture?: string };
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Google userinfo fetch failed: ${res.status}`);
    }
    googleUserInfo = await res.json();
  } catch (err) {
    throw new HttpException(400, "Failed to verify Google token");
  }

  const { email, name, sub: googleId, picture } = googleUserInfo;

  if (!email) {
    throw new HttpException(400, "Google account has no email associated");
  }

  // 2. Find user by email
  let user = await findUserByEmail(email);

  if (user) {
    // If user exists but doesn't have googleId linked, link it
    if (!user.googleId) {
      await updateUserById(user._id.toString(), { googleId, ...(picture && !user.profileImage ? { profileImage: picture } : {}) });
      user.googleId = googleId;
      if (picture && !user.profileImage) user.profileImage = picture;
    }
  } else {
    // 3. Create new user if not exists
    user = await createUser({
      fullName: name || "Google User",
      email: email.toLowerCase(),
      role: "unassigned",
      googleId,
      profileImage: picture,
      // No password needed
    });
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

  return {
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isVerifiedAdmin: user.email === process.env.ADMIN_EMAIL ? true : (user.isVerifiedAdmin ?? false),
      phoneNumber: user.phoneNumber ?? null,
      profileImage: user.profileImage ?? null,
    },
  };
};

/**
 * SET USER ROLE
 * Used for users who signed up via Google and have an "unassigned" role.
 */
export const setUserRole = async (userId: string, role: string) => {
  if (role !== "student" && role !== "tutor" && role !== "admin") {
    throw new HttpException(400, "Invalid role");
  }

  const user = await findUserById(userId);
  if (!user) throw new HttpException(404, "User not found");
  
  if (user.role !== "unassigned") {
    throw new HttpException(400, "User already has a role assigned");
  }

  // Admin accounts start with isVerifiedAdmin: false and need approval
  // UNLESS they are the default admin email
  const updatePayload: Record<string, any> = { role };
  const isDefaultAdmin = user.email === process.env.ADMIN_EMAIL && role === "admin";
  
  if (role === "admin") {
    updatePayload.isVerifiedAdmin = isDefaultAdmin;
  }

  const updatedUser = await updateUserById(userId, updatePayload);

  // Generate new JWT since role changed
  const token = jwt.sign(
    {
      id: updatedUser!._id,
      email: updatedUser!.email,
      role: updatedUser!.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    requiresAdminApproval: role === "admin" && !isDefaultAdmin,
    user: {
      id: updatedUser!._id,
      fullName: updatedUser!.fullName,
      email: updatedUser!.email,
      role: updatedUser!.role,
      isVerifiedAdmin: updatedUser!.isVerifiedAdmin,
      phoneNumber: updatedUser!.phoneNumber ?? null,
      profileImage: updatedUser!.profileImage ?? null,
    },
  };
};
