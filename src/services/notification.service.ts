import { z } from "zod";
import { HttpException } from "../exceptions/http-exception";
import {
  clearAllNotifications,
  createNotification,
  findNotificationsByUserId,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  createTutorNotification,
} from "../repositories/notification.repository";
import { findStudentsByTutorId } from "../repositories/booking.repository";
import { NotificationType } from "../models/notification.model";

export const getMyNotifications = async (userId: string) => {
  const notifications = await findNotificationsByUserId(userId);
  return notifications.map((n: any) => ({
    id: n._id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    senderId: n.senderId,
    courseId: n.courseId,
    createdAt: n.createdAt,
  }));
};

export const notifyUser = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string
) => {
  return await createNotification({ userId, type, title, message });
};

export const readNotification = async (notificationId: string) => {
  const result = await markNotificationAsRead(notificationId);
  if (!result) throw new HttpException(404, "Notification not found");
  return result;
};

export const readAllNotifications = async (userId: string) => {
  await markAllNotificationsAsRead(userId);
  return { success: true };
};

export const clearNotifications = async (userId: string) => {
  await clearAllNotifications(userId);
  return { success: true };
};

/**
 * Get all students of a tutor (via accepted bookings), de-duplicated by student ID.
 */
export const getMyStudents = async (tutorId: string) => {
  const bookings = await findStudentsByTutorId(tutorId);
  // De-duplicate — a student may have multiple bookings
  const seen = new Set<string>();
  const students: any[] = [];
  for (const b of bookings) {
    const student = b.studentId as any;
    if (!student || !student._id) continue;
    const sid = student._id.toString();
    if (!seen.has(sid)) {
      seen.add(sid);
      students.push({
        id: sid,
        fullName: student.fullName,
        email: student.email,
        profileImage: student.profileImage || null,
      });
    }
  }
  return students;
};

/**
 * Send a notification from a tutor to a specific student.
 * Validates that the student actually has a booking with the tutor.
 */
export const sendTutorNotificationToStudent = async (
  tutorId: string,
  data: { studentId: string; title: string; message: string; courseId?: string }
) => {
  const schema = z.object({
    studentId: z.string().min(1),
    title: z.string().min(1, "Title is required").max(100),
    message: z.string().min(1, "Message is required").max(1000),
    courseId: z.string().optional(),
  });
  const validated = schema.parse(data);

  // Confirm the student has a booking with this tutor
  const bookings = await findStudentsByTutorId(tutorId);
  // De-duplicate student IDs
  const studentIds = Array.from(new Set(
    bookings.map((b: any) => (b.studentId as any)?._id?.toString()).filter(Boolean)
  ));

  if (validated.studentId === "all") {
    if (studentIds.length === 0) {
      throw new HttpException(400, "You don't have any students to notify.");
    }
    // Send to all students
    const promises = studentIds.map((sid) => 
      createTutorNotification({
        senderId: tutorId,
        userId: sid,
        title: validated.title,
        message: validated.message,
        courseId: validated.courseId,
      })
    );
    await Promise.all(promises);
    return { success: true, count: studentIds.length };
  } else {
    if (!studentIds.includes(validated.studentId)) {
      throw new HttpException(403, "You can only send notifications to your own students");
    }

    return await createTutorNotification({
      senderId: tutorId,
      userId: validated.studentId,
      title: validated.title,
      message: validated.message,
      courseId: validated.courseId,
    });
  }
};
