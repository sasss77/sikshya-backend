import { Router } from "express";
import {
  getChatRooms,
  getChatMessages,
  getOrCreateChatRoom,
  searchChatUsers,
} from "../controllers/chat.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const router = Router();

// All chat routes require authentication
router.use(authorizedMiddleware);

router.get("/search", searchChatUsers);
router.get("/rooms", getChatRooms);
router.post("/rooms", getOrCreateChatRoom);
router.get("/rooms/:roomId/messages", getChatMessages);

export default router;
