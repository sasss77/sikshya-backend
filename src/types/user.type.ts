export type UserRole = "student" | "tutor" | "admin";

export interface IUser {
  fullName: string;
  email: string;
  role: UserRole;
  password: string;
  phoneNumber?: string;
  profileImage?: string;
}

export interface IUpdateProfile {
  fullName?: string;
  password?: string;
  phoneNumber?: string;
  profileImage?: string;
}