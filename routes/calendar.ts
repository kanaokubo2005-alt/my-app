import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getEvents,
  getTodayFreeTime,
  createEvent,
  editEvent,
  removeEvent,
  getCalendarStatus
} from "../controllers/calendarController";

const router = Router();

// OAuth initiation and redirect callbacks
router.get("/auth-url", requireAuth, getGoogleAuthUrl);
router.get("/callback", handleGoogleCallback);
router.get("/status", requireAuth, getCalendarStatus);

// Calendar CRUD operations
router.get("/events", requireAuth, getEvents);
router.post("/events", requireAuth, createEvent);
router.put("/events/:id", requireAuth, editEvent);
router.delete("/events/:id", requireAuth, removeEvent);

// Calculate free time blocks
router.get("/free-time", requireAuth, getTodayFreeTime);

export default router;
