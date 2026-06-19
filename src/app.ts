import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";

import userRoutes from "./routes/user.route";
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

/**
 * Global Error Handler (MUST be last)
 */
app.use(errorMiddleware);

export default app;