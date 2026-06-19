import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpException } from "../exceptions/http-exception";
import { findUserById } from "../repositories/user.repository";
import { IUserDocument } from "../models/user.model";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}

export const authorizedMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpException(401, "Unauthorized: Invalid token format");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new HttpException(401, "Unauthorized: Token missing");
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    if (!decoded?.id) {
      throw new HttpException(401, "Unauthorized: Invalid token");
    }

    const user = await findUserById(decoded.id);

    if (!user) {
      throw new HttpException(401, "Unauthorized: User not found");
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new HttpException(401, "Unauthorized");
    }

    if (req.user.role !== "admin") {
      throw new HttpException(403, "Forbidden: Admins only");
    }

    next();
  } catch (error) {
    next(error);
  }
};