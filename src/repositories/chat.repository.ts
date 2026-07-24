import mongoose from "mongoose";
import { ChatRoomModel } from "../models/chat-room.model";
import { MessageModel } from "../models/message.model";

/**
 * Find an existing room between two users or create a new one.
 */
export const findOrCreateRoom = async (user1Id: string, user2Id: string) => {
  const u1 = new mongoose.Types.ObjectId(user1Id);
  const u2 = new mongoose.Types.ObjectId(user2Id);

  // Look for a room that contains both participants
  let room = await ChatRoomModel.findOne({
    participants: { $all: [u1, u2], $size: 2 },
  });

  if (!room) {
    room = await ChatRoomModel.create({ participants: [u1, u2] });
  }

  return room;
};

/**
 * Get paginated message history for a room.
 */
export const getMessagesForRoom = async (roomId: string, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  return MessageModel.find({ roomId })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate("senderId", "fullName profileImage")
    .lean();
};

/**
 * Save a new message to the database and update the room's last message.
 */
export const saveMessage = async (data: {
  roomId: string;
  senderId: string;
  receiverId: string;
  content: string;
}) => {
  const message = await MessageModel.create({
    roomId: data.roomId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    content: data.content,
  });

  await ChatRoomModel.findByIdAndUpdate(data.roomId, {
    lastMessage: data.content,
    lastMessageAt: new Date(),
    lastMessageSenderId: data.senderId,
  });

  return message;
};

/**
 * Get all chat rooms (conversations) for a user, sorted by most recent.
 */
export const getRoomsForUser = async (userId: string) => {
  return ChatRoomModel.find({ participants: userId })
    .sort({ lastMessageAt: -1 })
    .populate("participants", "fullName profileImage role")
    .lean();
};

/**
 * Mark all messages in a room as read for the given user (as receiver).
 */
export const markRoomMessagesRead = async (roomId: string, userId: string) => {
  await MessageModel.updateMany(
    { roomId, receiverId: userId, readAt: null },
    { readAt: new Date() }
  );
};

/**
 * Count unread messages in a room for a specific receiver.
 */
export const countUnreadInRoom = async (roomId: string, userId: string) => {
  return MessageModel.countDocuments({ roomId, receiverId: userId, readAt: null });
};
