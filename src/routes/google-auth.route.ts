/**
 * Google OAuth2 Setup Route
 *
 * This route helps you obtain a Refresh Token for the Google Calendar API.
 * 
 * USAGE (one-time setup):
 *  1. Start the backend server
 *  2. Visit: GET /api/google/auth-url
 *  3. Open the returned URL in your browser
 *  4. Authorize with your Google account
 *  5. You'll get a code — visit: GET /api/google/callback?code=<CODE>
 *  6. Copy the returned refresh_token
 *  7. Paste it as GOOGLE_REFRESH_TOKEN=<token> in your backend .env
 */

import { Router, Request, Response } from "express";
import { google } from "googleapis";
import fs from "fs";
import path from "path";

const router = Router();

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.SERVER_URL || "http://localhost:5000"}/api/google/callback`
  );
}

// Step 1: Get the authorization URL
router.get("/auth-url", (req: Request, res: Response) => {
  const oAuth2Client = getOAuthClient();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token generation
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });
  res.json({ authUrl, message: "Open this URL in your browser to authorize Google Calendar access." });
});

// Step 2: Exchange the auth code for tokens
router.get("/callback", async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  try {
    const oAuth2Client = getOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    
    // Automatically save to .env
    if (tokens.refresh_token) {
      const envPath = path.resolve(process.cwd(), ".env");
      let envContent = fs.readFileSync(envPath, "utf8");
      
      if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
        envContent = envContent.replace(
          /GOOGLE_REFRESH_TOKEN=.*/,
          `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
        );
      } else {
        envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
      }
      
      fs.writeFileSync(envPath, envContent, "utf8");
      console.log("✅ Google Refresh Token automatically saved to .env!");
    }

    res.json({
      success: true,
      message: "✅ SUCCESS! The refresh token has been automatically saved to your .env file! You can now close this tab and restart your backend server.",
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
    });
  } catch (error: any) {
    console.error("OAuth Error:", error.message);
    res.status(500).json({ 
      error: "Failed to exchange code", 
      details: error.message,
      help: "If you refreshed the page, the code might have already been used. Check your .env file to see if GOOGLE_REFRESH_TOKEN was already saved!"
    });
  }
});

export default router;
