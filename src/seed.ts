/**
 * SEED SCRIPT — Creates default admin user if none exists.
 * Run with: npx ts-node src/seed.ts
 * Or via package.json script: npm run seed
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "./models/user.model";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sikshya.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";
const ADMIN_NAME = process.env.ADMIN_NAME || "Sikshya Admin";

const seed = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI not set in .env");
    }

    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existing = await UserModel.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`ℹ️  Admin already exists: ${ADMIN_EMAIL}`);
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Create admin
    const admin = await UserModel.create({
      fullName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      isVerifiedStudent: false,
      isVerifiedAdmin: true,
    });

    console.log("🎉 Default admin created successfully!");
    console.log(`   Email   : ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   ID      : ${admin._id}`);

    await mongoose.disconnect();
    console.log("✅ Done. Database connection closed.");
  } catch (err) {
    console.error("❌ Seed failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
