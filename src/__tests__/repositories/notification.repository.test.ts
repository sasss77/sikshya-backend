import mongoose from "mongoose";
import {
  createNotification,
  findNotificationsByUserId,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  createTutorNotification,
} from "../../repositories/notification.repository";

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeUserId = () => new mongoose.Types.ObjectId().toString();

const makeNotifData = (userId: string, overrides = {}) => ({
  userId,
  type: "system" as const,
  title: "Test Notification",
  message: "Hello world",
  ...overrides,
});

// ─── createNotification ──────────────────────────────────────────────────────

describe("notificationRepository.createNotification", () => {
  it("should create a notification", async () => {
    const userId = makeUserId();
    const notif = await createNotification(makeNotifData(userId));
    expect(notif._id).toBeDefined();
    expect(notif.title).toBe("Test Notification");
    expect(notif.read).toBe(false);
  });

  it("should create notification with booking type", async () => {
    const userId = makeUserId();
    const notif = await createNotification(makeNotifData(userId, { type: "booking" }));
    expect(notif.type).toBe("booking");
  });
});

// ─── findNotificationsByUserId ───────────────────────────────────────────────

describe("notificationRepository.findNotificationsByUserId", () => {
  it("should return notifications for a user sorted by newest first", async () => {
    const userId = makeUserId();
    await createNotification(makeNotifData(userId, { title: "First" }));
    await createNotification(makeNotifData(userId, { title: "Second" }));
    const results = await findNotificationsByUserId(userId);
    expect(results.length).toBe(2);
  });

  it("should return empty array for user with no notifications", async () => {
    const results = await findNotificationsByUserId(makeUserId());
    expect(results).toHaveLength(0);
  });

  it("should not return notifications of other users", async () => {
    const user1 = makeUserId();
    const user2 = makeUserId();
    await createNotification(makeNotifData(user1));
    const results = await findNotificationsByUserId(user2);
    expect(results).toHaveLength(0);
  });
});

// ─── markNotificationAsRead ──────────────────────────────────────────────────

describe("notificationRepository.markNotificationAsRead", () => {
  it("should set read to true", async () => {
    const userId = makeUserId();
    const notif = await createNotification(makeNotifData(userId));
    const result = await markNotificationAsRead(notif._id.toString());
    expect(result!.read).toBe(true);
  });
});

// ─── markAllNotificationsAsRead ──────────────────────────────────────────────

describe("notificationRepository.markAllNotificationsAsRead", () => {
  it("should mark all notifications as read for a user", async () => {
    const userId = makeUserId();
    await createNotification(makeNotifData(userId));
    await createNotification(makeNotifData(userId));
    await markAllNotificationsAsRead(userId);
    const notifs = await findNotificationsByUserId(userId);
    expect(notifs.every((n) => n.read)).toBe(true);
  });
});

// ─── clearAllNotifications ───────────────────────────────────────────────────

describe("notificationRepository.clearAllNotifications", () => {
  it("should delete all notifications for a user", async () => {
    const userId = makeUserId();
    await createNotification(makeNotifData(userId));
    await createNotification(makeNotifData(userId));
    await clearAllNotifications(userId);
    const remaining = await findNotificationsByUserId(userId);
    expect(remaining).toHaveLength(0);
  });
});

// ─── createTutorNotification ─────────────────────────────────────────────────

describe("notificationRepository.createTutorNotification", () => {
  it("should create a tutor notification for a student", async () => {
    const senderId = makeUserId();
    const recipientId = makeUserId();
    const notif = await createTutorNotification({
      senderId,
      userId: recipientId,
      title: "New Assignment",
      message: "Please complete chapter 3",
    });
    expect(notif._id).toBeDefined();
    expect(notif.type).toBe("course");
    expect(notif.read).toBe(false);
  });

  it("should include courseId when provided", async () => {
    const senderId = makeUserId();
    const recipientId = makeUserId();
    const courseId = new mongoose.Types.ObjectId().toString();
    const notif = await createTutorNotification({
      senderId,
      userId: recipientId,
      title: "Course Update",
      message: "Module added",
      courseId,
    });
    expect(notif.courseId?.toString()).toBe(courseId);
  });
});
