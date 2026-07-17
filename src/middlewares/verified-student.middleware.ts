import { Request, Response, NextFunction } from "express";
import { HttpException } from "../exceptions/http-exception";

/**
 * VERIFIED STUDENT GUARD
 *
 * Must be used AFTER authorizedMiddleware (which populates req.user).
 *
 * Ensures that only students who have completed the verification flow
 * (isVerifiedStudent === true) can access the protected route.
 *
 * Usage:
 *   router.post("/bookings", authorizedMiddleware, verifiedStudentMiddleware, createBooking);
 */
export const verifiedStudentMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new HttpException(401, "Unauthorized");
    }

    // Only applies to students; tutors/admins pass through freely
    if (req.user.role === "student" && !req.user.isVerifiedStudent) {
      throw new HttpException(
        403,
        "Student verification required. Please complete your student profile before booking a tutor."
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
