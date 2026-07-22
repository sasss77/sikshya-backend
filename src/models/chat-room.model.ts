import mongoose, { Schema, Document } from "mongoose";

export interface IChatRoomDocument extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageSenderId?: mongoose.Types.ObjectId;
}

const chatRoomSchema = new Schema<IChatRoomDocument>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageSenderId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Ensure a unique room per pair of participants
chatRoomSchema.index({ participants: 1 });

export const ChatRoomModel = mongoose.model<IChatRoomDocument>("ChatRoom", chatRoomSchema);
