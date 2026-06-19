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