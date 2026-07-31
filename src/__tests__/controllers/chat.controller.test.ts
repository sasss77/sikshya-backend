import { Request, Response, NextFunction } from "express";
import { getChatRooms, getChatMessages, getOrCreateChatRoom, searchChatUsers } from "../../controllers/chat.controller";
import * as chatRepo from "../../repositories/chat.repository";
import { UserModel } from "../../models/user.model";
import { HttpException } from "../../exceptions/http-exception";

jest.mock("../../repositories/chat.repository");
jest.mock("../../models/user.model");

describe("Chat Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { _id: "user1", role: "student" } as any,
      params: {},
      query: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("getChatRooms", () => {
    it("should return formatted chat rooms successfully", async () => {
      const mockRooms = [
        {
          _id: "room1",
          participants: [
            { _id: { toString: () => "user1" } },
            { _id: { toString: () => "user2" }, fullName: "User Two", role: "tutor", profileImage: "img.jpg" },
          ],
          lastMessage: "Hello",
          lastMessageAt: new Date(),
          lastMessageSenderId: "user2",
        },
      ];
      (chatRepo.getRoomsForUser as jest.Mock).mockResolvedValue(mockRooms);
      (chatRepo.countUnreadInRoom as jest.Mock).mockResolvedValue(2);

      await getChatRooms(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: "room1",
              unreadCount: 2,
              lastMessageIsMe: false,
              otherUser: expect.objectContaining({ fullName: "User Two" }),
            }),
          ]),
        })
      );
    });

    it("should handle error", async () => {
      const err = new Error("DB Error");
      (chatRepo.getRoomsForUser as jest.Mock).mockRejectedValue(err);
      await getChatRooms(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("getChatMessages", () => {
    it("should return formatted messages and mark as read", async () => {
      req.params = { roomId: "room1" };
      req.query = { page: "1" };
      const mockMessages = [
        {
          _id: "msg1",
          senderId: { _id: "user2", fullName: "User Two", toString: () => "user2" },
          content: "Hi",
          createdAt: new Date(),
          readAt: null,
        },
      ];
      (chatRepo.getMessagesForRoom as jest.Mock).mockResolvedValue(mockMessages);
      (chatRepo.markRoomMessagesRead as jest.Mock).mockResolvedValue(undefined);

      await getChatMessages(req as Request, res as Response, next);

      expect(chatRepo.markRoomMessagesRead).toHaveBeenCalledWith("room1", "user1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ content: "Hi", isMe: false }),
          ]),
        })
      );
    });

    it("should default to page 1 if not provided", async () => {
      req.params = { roomId: "room1" };
      req.query = {};
      (chatRepo.getMessagesForRoom as jest.Mock).mockResolvedValue([]);
      await getChatMessages(req as Request, res as Response, next);
      expect(chatRepo.getMessagesForRoom).toHaveBeenCalledWith("room1", 1);
    });
  });

  describe("getOrCreateChatRoom", () => {
    it("should throw 400 if otherUserId is not provided", async () => {
      req.body = {};
      await getOrCreateChatRoom(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpException));
    });

    it("should throw 400 if otherUserId is the same as userId", async () => {
      req.body = { otherUserId: "user1" };
      await getOrCreateChatRoom(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpException));
    });

    it("should return room and other user info", async () => {
      req.body = { otherUserId: "user2" };
      const mockRoom = { _id: "room1", lastMessage: "Hey", lastMessageAt: new Date() };
      const mockOtherUser = { _id: "user2", fullName: "User Two", role: "tutor", profileImage: null };

      (chatRepo.findOrCreateRoom as jest.Mock).mockResolvedValue(mockRoom);
      (UserModel.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockOtherUser),
      });

      await getOrCreateChatRoom(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: "room1",
            otherUser: expect.objectContaining({ fullName: "User Two" }),
          }),
        })
      );
    });
  });

  describe("searchChatUsers", () => {
    it("should search target role users based on query", async () => {
      req.query = { q: "test" };
      const mockUsers = [
        { _id: "tutor1", fullName: "Test Tutor", role: "tutor", profileImage: null },
      ];
      (UserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });

      await searchChatUsers(req as Request, res as Response, next);

      expect(UserModel.find).toHaveBeenCalledWith({
        role: "tutor", // student searches for tutor
        fullName: { $regex: "test", $options: "i" },
        _id: { $ne: req.user!._id },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ fullName: "Test Tutor" }),
          ]),
        })
      );
    });
  });
});
