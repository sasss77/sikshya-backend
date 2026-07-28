import jwt from "jsonwebtoken";
import { UserModel } from "../../models/user.model";

/**
 * Generate a signed test JWT for the given payload.
 * Uses JWT_SECRET from process.env (set by global-setup.ts → setup.ts).
 */
export const generateTestToken = (payload: {
  id: string;
  email: string;
  role: string;
}) => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1d" });
};

/**
 * Create a real user in the DB and return both user doc and signed token.
 */
export const createTestUser = async (overrides: {
  fullName?: string;
  email?: string;
  role?: "student" | "tutor" | "admin" | "unassigned";
  password?: string;
  isVerifiedAdmin?: boolean;
  isVerifiedStudent?: boolean;
} = {}) => {
  const user = await UserModel.create({
    fullName: overrides.fullName ?? "Test User",
    email: overrides.email ?? `user_${Date.now()}_${Math.random()}@test.com`,
    role: overrides.role ?? "student",
    password: overrides.password ?? "hashed_password",
    isVerifiedAdmin: overrides.isVerifiedAdmin ?? false,
    isVerifiedStudent: overrides.isVerifiedStudent ?? false,
  });
  const token = generateTestToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  return { user, token };
};
