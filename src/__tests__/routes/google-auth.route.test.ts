import request from "supertest";
import express from "express";
import googleAuthRoute from "../../routes/google-auth.route";
import { google } from "googleapis";
import fs from "fs";

jest.mock("googleapis", () => {
  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => {
          return {
            generateAuthUrl: jest.fn().mockReturnValue("http://auth.url"),
            getToken: jest.fn().mockResolvedValue({ tokens: { refresh_token: "mock_refresh_token", access_token: "mock_access_token" } }),
          };
        }),
      },
    },
  };
});

jest.mock("fs");

const app = express();
app.use(express.json());
app.use("/api/google", googleAuthRoute);

describe("Google Auth Route", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("GET /api/google/auth-url", () => {
    it("should return the auth URL", async () => {
      const res = await request(app).get("/api/google/auth-url");
      expect(res.status).toBe(200);
      expect(res.body.authUrl).toBe("http://auth.url");
    });
  });

  describe("GET /api/google/callback", () => {
    it("should require a code", async () => {
      const res = await request(app).get("/api/google/callback");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing authorization code");
    });

    it("should exchange code for tokens and save to .env if not exists", async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("SOME_ENV=value\n");
      const res = await request(app).get("/api/google/callback?code=mock_code");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should exchange code for tokens and replace in .env if exists", async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("GOOGLE_REFRESH_TOKEN=old_token\n");
      const res = await request(app).get("/api/google/callback?code=mock_code");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
    
    it("should handle error if getToken fails", async () => {
      // Need to override the mock for this specific test
      (google.auth.OAuth2 as unknown as jest.Mock).mockImplementationOnce(() => {
        return {
          getToken: jest.fn().mockRejectedValue(new Error("Token Error")),
        };
      });
      const res = await request(app).get("/api/google/callback?code=invalid_code");
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to exchange code");
    });
  });
});
