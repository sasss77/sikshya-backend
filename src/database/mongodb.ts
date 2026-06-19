import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config(); 

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);

    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);

    process.exit(1);
  }
};