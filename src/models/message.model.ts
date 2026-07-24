import mongoose, { Schema, Document } from "mongoose";

export interface IMessageDocument extends Document {
  roomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  readAt?: Date;
  createdAt: Date;
}

const messageSchema = new Schema<IMessageDocument>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "ChatRoom", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, createdAt: 1 });

export const MessageModel = mongoose.model<IMessageDocument>("Message", messageSchema);
