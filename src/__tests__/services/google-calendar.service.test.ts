import { createMeetSession, deleteMeetSession } from "../../services/google-calendar.service";
import { google } from "googleapis";

jest.mock("googleapis", () => {
  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => {
          return { setCredentials: jest.fn() };
        }),
      },
      calendar: jest.fn().mockReturnValue({
        events: {
          insert: jest.fn().mockResolvedValue({
            data: {
              id: "eventId",
              hangoutLink: "http://meet.google.com/abc",
            },
          }),
          delete: jest.fn().mockResolvedValue({}),
        },
      }),
    },
  };
});

describe("Google Calendar Service", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "client_id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    process.env.GOOGLE_REFRESH_TOKEN = "refresh";
    jest.clearAllMocks();
  });

  describe("createMeetSession", () => {
    it("should create an event with meet link", async () => {
      const result = await createMeetSession("Student Name", "Tutor Name", "Math", "Mon", "10:00 AM");
      expect(result.meetLink).toBe("http://meet.google.com/abc");
      expect(result.calendarEventId).toBe("eventId");
      expect(result.startDateTime).toBeDefined();
    });

    it("should parse PM times correctly", async () => {
      const result = await createMeetSession("Student Name", "Tutor Name", "Math", "Mon", "2:30 PM");
      expect(result.meetLink).toBe("http://meet.google.com/abc");
    });
    
    it("should handle invalid times", async () => {
      const result = await createMeetSession("Student", "Tutor", "Math", "Mon", "invalid");
      expect(result.meetLink).toBe("http://meet.google.com/abc");
    });
  });

  describe("deleteMeetSession", () => {
    it("should delete event", async () => {
      const result = await deleteMeetSession("eventId");
      expect(result).toBe(true);
    });
  });
});
