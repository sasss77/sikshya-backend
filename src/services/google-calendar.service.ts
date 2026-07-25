import { google } from "googleapis";

/**
 * Google Calendar Service
 * 
 * Uses OAuth2 with a stored refresh token to create Google Calendar events
 * with Google Meet conference links.
 * 
 * Required environment variables:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 *   GOOGLE_CALENDAR_ID (optional, defaults to "primary")
 */

// Day name → day-of-week index (0=Sunday)
const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/**
 * Gets the next occurrence of a given weekday from now.
 * e.g. if today is Monday and day="Wed", returns next Wednesday's date.
 */
function getNextOccurrenceOfDay(dayName: string): Date {
  const targetDay = DAY_MAP[dayName] ?? 1; // default Monday
  const now = new Date();
  const result = new Date(now);
  const currentDay = now.getDay();

  let daysUntilTarget = targetDay - currentDay;
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7; // next week
  }

  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

/**
 * Parse a time string like "10:00 AM" or "2:30 PM" into { hours, minutes }.
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 9, minutes: 0 }; // default 9 AM

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

/**
 * Build an OAuth2 client using stored credentials.
 */
function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google OAuth2 credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env"
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret, "urn:ietf:wg:oauth:2.0:oob");
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

export interface MeetSessionResult {
  meetLink: string;
  calendarEventId: string;
  startDateTime: string;
  endDateTime: string;
}

/**
 * Creates a Google Calendar event with a Google Meet link.
 *
 * @param studentName  Name of the student
 * @param tutorName    Name of the tutor
 * @param subject      Subject/topic of the session
 * @param day          Day shortname: "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
 * @param time         Time string: "10:00 AM", "2:30 PM", etc.
 * @param studentEmail Optional student email to add as attendee
 * @param tutorEmail   Optional tutor email to add as attendee
 */
export const createMeetSession = async (
  studentName: string,
  tutorName: string,
  subject: string,
  day: string,
  time: string,
  studentEmail?: string,
  tutorEmail?: string
): Promise<MeetSessionResult> => {
  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  // Compute session date/time
  const sessionDate = getNextOccurrenceOfDay(day);
  const { hours, minutes } = parseTimeString(time);

  const startDateTime = new Date(sessionDate);
  startDateTime.setHours(hours, minutes, 0, 0);

  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1); // 1-hour session

  // Build attendees list
  const attendees: { email: string; displayName?: string }[] = [];
  if (studentEmail) attendees.push({ email: studentEmail, displayName: studentName });
  if (tutorEmail) attendees.push({ email: tutorEmail, displayName: tutorName });

  // Unique conference request ID (idempotency key)
  const conferenceRequestId = `sikshya-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  const event = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1, // required to generate Meet link
    sendUpdates: attendees.length > 0 ? "all" : "none",
    requestBody: {
      summary: `Sikshya: ${subject} — ${studentName} & ${tutorName}`,
      description: `Online tutoring session for ${subject}.\n\nStudent: ${studentName}\nTutor: ${tutorName}\n\nSession scheduled via Sikshya Platform.`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "Asia/Kathmandu",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "Asia/Kathmandu",
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: conferenceRequestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    },
  });

  const meetLink = event.data.hangoutLink || event.data.conferenceData?.entryPoints?.[0]?.uri;
  if (!meetLink) {
    throw new Error("Google Calendar event created but no Meet link was returned. Ensure your Google account has Meet enabled.");
  }

  return {
    meetLink,
    calendarEventId: event.data.id || "",
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
  };
};

/**
 * Delete a Google Calendar event by ID.
 * Used when a booking is cancelled.
 */
export const deleteMeetSession = async (eventId: string) => {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  try {
    const calendar = getOAuthClient();
    await calendar.events.delete({
      calendarId,
      eventId,
    });
    console.log(`[Google Calendar] Event ${eventId} deleted successfully`);
    return true;
  } catch (error: any) {
    console.error(`[Google Calendar] Failed to delete event ${eventId}: ${error.message}`);
    return false;
  }
};
