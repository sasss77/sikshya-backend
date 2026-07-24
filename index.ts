import "dotenv/config";
import http from "http";
import dns from "dns";
// Force Node to use IPv4 first to prevent "failed to fetch" errors with external APIs like Groq
dns.setDefaultResultOrder("ipv4first");
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { connectDB } from "./src/database/mongodb";
import app from "./src/app";
import { saveMessage, findOrCreateRoom, markRoomMessagesRead } from "./src/repositories/chat.repository";


const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Create HTTP server from Express app
const httpServer = http.createServer(app);

// Attach Socket.IO to HTTP server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Map userId -> socketId for online tracking
const onlineUsers = new Map<string, string>();

// JWT auth middleware for Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication error: No token"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };
    (socket as any).userId = decoded.id;
    (socket as any).userRole = decoded.role;
    next();
  } catch {
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = (socket as any).userId as string;
  console.log(`[Socket] User connected: ${userId} (${socket.id})`);

  // Register this user as online
  onlineUsers.set(userId, socket.id);

  // Notify everyone that this user is online
  socket.broadcast.emit("user_online", { userId });

  // Send the current online users list to the newly connected client
  socket.emit("online_users", Array.from(onlineUsers.keys()));

  // ─── Join Room ─────────────────────────────────────────────────
  socket.on("join_room", async ({ roomId }: { roomId: string }) => {
    socket.join(roomId);
    await markRoomMessagesRead(roomId, userId);
    // Notify others in room that messages are read
    socket.to(roomId).emit("messages_read", { roomId, userId });
  });

  // ─── Send Message ───────────────────────────────────────────────
  socket.on("send_message", async ({ roomId, receiverId, content }: { roomId: string; receiverId: string; content: string }) => {
    try {
      if (!content?.trim()) return;

      const message = await saveMessage({ roomId, senderId: userId, receiverId, content: content.trim() });

      const payload = {
        id: message._id.toString(),
        roomId,
        senderId: userId,
        receiverId,
        content: message.content,
        createdAt: message.createdAt,
        readAt: null,
      };

      // Emit to everyone in the room (including sender for confirmation)
      io.to(roomId).emit("receive_message", payload);

      // If receiver is not in this room socket, emit to their personal socket too
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new_message_notification", {
          roomId,
          senderId: userId,
          content: message.content,
          createdAt: message.createdAt,
        });
      }
    } catch (err) {
      console.error("[Socket] send_message error:", err);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });

  // ─── Typing Indicator ──────────────────────────────────────────
  socket.on("typing", ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
    socket.to(roomId).emit("typing_update", { userId, isTyping });
  });

  // ─── Mark Read ─────────────────────────────────────────────────
  socket.on("mark_read", async ({ roomId }: { roomId: string }) => {
    await markRoomMessagesRead(roomId, userId);
    socket.to(roomId).emit("messages_read", { roomId, userId });
  });

  // ─── Disconnect ─────────────────────────────────────────────────
  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    socket.broadcast.emit("user_offline", { userId });
    console.log(`[Socket] User disconnected: ${userId}`);
  });
});

const startServer = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO ready — CORS origin: ${CLIENT_URL}`);
  });
};

startServer();