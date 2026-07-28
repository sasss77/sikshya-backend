import mongoose from "mongoose";
// Import UserModel to ensure the schema is registered before populate() is called
import "../../models/user.model";
import {
  findOrCreateRoom,
  getMessagesForRoom,
  saveMessage,
  getRoomsForUser,
  markRoomMessagesRead,
  countUnreadInRoom,
} from "../../repositories/chat.repository";

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeId = () => new mongoose.Types.ObjectId().toString();

// ─── findOrCreateRoom ────────────────────────────────────────────────────────

describe("chatRepository.findOrCreateRoom", () => {
  it("should create a new room for two users", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const room = await findOrCreateRoom(user1, user2);
    expect(room._id).toBeDefined();
    expect(room.participants.map((p) => p.toString())).toContain(user1);
    expect(room.participants.map((p) => p.toString())).toContain(user2);
  });

  it("should return the same room if called again for the same users", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const room1 = await findOrCreateRoom(user1, user2);
    const room2 = await findOrCreateRoom(user1, user2);
    expect(room1._id.toString()).toBe(room2._id.toString());
  });

  it("should return the same room regardless of participant order", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const room1 = await findOrCreateRoom(user1, user2);
    const room2 = await findOrCreateRoom(user2, user1);
    expect(room1._id.toString()).toBe(room2._id.toString());
  });
});

// ─── saveMessage ─────────────────────────────────────────────────────────────

describe("chatRepository.saveMessage", () => {
  it("should save a message and update the room last message", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const room = await findOrCreateRoom(user1, user2);
    const msg = await saveMessage({
      roomId: room._id.toString(),
      senderId: user1,
      receiverId: user2,
      content: "Hello!",
    });
    expect(msg._id).toBeDefined();
    expect(msg.content).toBe("Hello!");
  });
});

// ─── getMessagesForRoom ──────────────────────────────────────────────────────

describe("chatRepository.getMessagesForRoom", () => {
  it("should return messages for a room in ascending order", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const room = await findOrCreateRoom(user1, user2);
    await saveMessage({ roomId: room._id.toString(), senderId: user1, receiverId: user2, content: "Msg 1" });
    await saveMessage({ roomId: room._id.toString(), senderId: user2, receiverId: user1, content: "Msg 2" });
    const messages = await getMessagesForRoom(room._id.toString());
    expect(messages.length).toBe(2);
    expect((messages[0] as any).content).toBe("Msg 1");
    expect((messages[1] as any).content).toBe("Msg 2");
  });

  it("should return empty array for room with no messages", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const room = await findOrCreateRoom(user1, user2);
    const messages = await getMessagesForRoom(room._id.toString());
    expect(messages).toHaveLength(0);
  });
});

// ─── getRoomsForUser ─────────────────────────────────────────────────────────

describe("chatRepository.getRoomsForUser", () => {
  it("should return all rooms for a user", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const user3 = makeId();
    await findOrCreateRoom(user1, user2);
    await findOrCreateRoom(user1, user3);
    const rooms = await getRoomsForUser(user1);
    expect(rooms.length).toBe(2);
  });

  it("should return empty array for user with no rooms", async () => {
    const rooms = await getRoomsForUser(makeId());
    expect(rooms).toHaveLength(0);
  });
});

// ─── markRoomMessagesRead ────────────────────────────────────────────────────

describe("chatRepository.markRoomMessagesRead", () => {
  it("should mark messages as read for the receiver", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const room = await findOrCreateRoom(user1, user2);
    await saveMessage({ roomId: room._id.toString(), senderId: user1, receiverId: user2, content: "Hi" });
    await markRoomMessagesRead(room._id.toString(), user2);
    const unread = await countUnreadInRoom(room._id.toString(), user2);
    expect(unread).toBe(0);
  });
});

// ─── countUnreadInRoom ───────────────────────────────────────────────────────

describe("chatRepository.countUnreadInRoom", () => {
  it("should count unread messages for a user in a room", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const room = await findOrCreateRoom(user1, user2);
    await saveMessage({ roomId: room._id.toString(), senderId: user1, receiverId: user2, content: "A" });
    await saveMessage({ roomId: room._id.toString(), senderId: user1, receiverId: user2, content: "B" });
    const count = await countUnreadInRoom(room._id.toString(), user2);
    expect(count).toBe(2);
  });

  it("should return 0 when no unread messages", async () => {
    const user1 = makeId();
    const user2 = makeId();
    const room = await findOrCreateRoom(user1, user2);
    const count = await countUnreadInRoom(room._id.toString(), user2);
    expect(count).toBe(0);
  });
});
