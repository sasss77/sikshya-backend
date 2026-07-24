import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";

import userRoutes from "./routes/user.route";
import adminUserRoutes from "./routes/admin.user.route";
import studentRoutes from "./routes/student.route";
import tutorRoutes from "./routes/tutor.route";
import bookingRoutes from "./routes/booking.route";
import notificationRoutes from "./routes/notification.route";
import chatRoutes from "./routes/chat.route";
import aiRoutes from "./routes/ai.route";
import { errorMiddleware } from "./middlewares/errror.middleware";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/**
 * Serve uploaded profile images as static files
 * Access via: GET /uploads/profiles/<filename>
 */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/**
 * Health Check
 */
app.get("/", (_, res) => {
  res.status(200).json({
    success: true,
    message: "Sikshya Auth API Running",
  });
});

/**
 * Routes
 */
app.use("/api/users", userRoutes);
app.use("/api/v1/admin/users", adminUserRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);

/**
 * Global Error Handler (MUST be last)
 */
app.use(errorMiddleware);

export default app;