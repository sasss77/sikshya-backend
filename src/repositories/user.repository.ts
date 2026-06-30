import { UserModel } from "../models/user.model";

/**
  DATABASE LAYER ONLY

 */

export const createUser = async (data: any) => {
  return await UserModel.create(data);
};

export const findUserByEmail = async (email: string) => {
  return await UserModel.findOne({ email });
};

export const findUserById = async (id: string) => {
  return await UserModel.findById(id);
};

export const updateUserById = async (id: string, data: Record<string, any>) => {
  return await UserModel.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
};

export const findPaginatedUsers = async (page: number, limit: number, search: string) => {
  const query: any = {};
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await UserModel.countDocuments(query);
  const users = await UserModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });

  return {
    data: users.map(user => ({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  };
};

export const deleteUserById = async (id: string) => {
  return await UserModel.findByIdAndDelete(id);
};