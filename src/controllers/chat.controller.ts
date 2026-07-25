import { Request, Response, NextFunction } from "express";
import {
  findOrCreateRoom,
  getMessagesForRoom,
  getRoomsForUser,
  markRoomMessagesRead,
  countUnreadInRoom,
} from "../repositories/chat.repository";
import { UserModel } from "../models/user.model";
import { HttpException } from "../exceptions/http-exception";

/**
 * GET /api/chat/rooms
 * Returns all conversations for the logged-in user
 */
export const getChatRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();
    const rooms = await getRoomsForUser(userId);

    const formatted = await Promise.all(
      rooms.map(async (room: any) => {
        const other = room.participants.find(
          (p: any) => p._id.toString() !== userId
        );
        const unread = await countUnreadInRoom(room._id.toString(), userId);
        return {
          id: room._id,
          otherUser: {
            id: other?._id,
            fullName: other?.fullName || "Unknown",
            profileImage: other?.profileImage || null,
            role: other?.role,
          },
          lastMessage: room.lastMessage,
          lastMessageAt: room.lastMessageAt,
          lastMessageIsMe: room.lastMessageSenderId?.toString() === userId,
          unreadCount: unread,
        };
      })
    );

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/rooms/:roomId/messages
 * Returns paginated message history for a room
 */
export const getChatMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = req.params.roomId as string;
    const page = parseInt(req.query.page as string) || 1;
    const userId = req.user!._id.toString();

    const messages = await getMessagesForRoom(roomId, page);

    // Mark as read
    await markRoomMessagesRead(roomId, userId);

    const formatted = messages.map((m: any) => ({
      id: m._id,
      senderId: m.senderId._id || m.senderId,
      senderName: m.senderId?.fullName || "Unknown",
      senderImage: m.senderId?.profileImage || null,
      content: m.content,
      createdAt: m.createdAt,
      readAt: m.readAt,
      isMe: (m.senderId._id || m.senderId).toString() === userId,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/rooms
 * Create or get a room between the current user and another user
 */
export const getOrCreateChatRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();
    const { otherUserId } = req.body;

    if (!otherUserId) throw new HttpException(400, "otherUserId is required");
    if (otherUserId === userId) throw new HttpException(400, "Cannot chat with yourself");

    const room = await findOrCreateRoom(userId, otherUserId);
    const other = await UserModel.findById(otherUserId).select("fullName profileImage role").lean();

    res.status(200).json({
      success: true,
      data: {
        id: room._id,
        otherUser: {
          id: other?._id,
          fullName: other?.fullName || "Unknown",
          profileImage: (other as any)?.profileImage || null,
          role: other?.role,
        },
        lastMessage: room.lastMessage,
        lastMessageAt: room.lastMessageAt,
        unreadCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/search?q=&role=
 * Search users to start a new chat
 * - Students search for tutors
 * - Tutors search for students
 */
export const searchChatUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q = "" } = req.query;
    const myRole = req.user!.role;

    // Opposite role search
    const targetRole = myRole === "tutor" ? "student" : "tutor";

    const users = await UserModel.find({
      role: targetRole,
      fullName: { $regex: q as string, $options: "i" },
      _id: { $ne: req.user!._id },
    })
      .select("fullName profileImage role")
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      data: users.map((u) => ({
        id: u._id,
        fullName: u.fullName,
        profileImage: (u as any).profileImage || null,
        role: u.role,
      })),
    });
  } catch (error) {
    next(error);
  }
};
