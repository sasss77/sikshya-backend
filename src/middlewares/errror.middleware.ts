import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpException } from "../exceptions/http-exception";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // ZOD ERROR
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message, 
      })),
    });
  }

  // CUSTOM HTTP ERROR
  if (err instanceof HttpException) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  //FALLBACK
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};