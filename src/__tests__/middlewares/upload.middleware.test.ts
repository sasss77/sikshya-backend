import { Request } from "express";
import fs from "fs";
import { uploadProfileImage } from "../../middlewares/upload.middleware";
import { HttpException } from "../../exceptions/http-exception";

describe("Upload Middleware", () => {
  it("should have correct profile image setup", () => {
    expect(uploadProfileImage).toBeDefined();
  });
});
