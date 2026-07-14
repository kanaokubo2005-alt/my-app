import { Response, Request } from "express";
import { AuthRequest } from "../middlewares/auth";
import { OAuth2Client } from "google-auth-library";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import pg from "pg";
import {
  getEventsBetween,
  getFreeTime,
  addEvent,
  updateEvent,
  deleteEvent
} from "../services/googleCalendar";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Calendar OAuth is not configured");
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

// The state is opaque to Google and ties the callback to the signed-in app user.
// It expires quickly and never exposes a Firebase ID token to a third party.
function createOAuthState(userId: number): string {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  const secret = process.env.GOOGLE_CLIENT_SECRET!.trim();
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}.${randomBytes(12).toString("base64url")}`;
}

function getUserIdFromOAuthState(state: string): number | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || !process.env.GOOGLE_CLIENT_SECRET?.trim()) return null;
  const expected = createHmac("sha256", process.env.GOOGLE_CLIENT_SECRET.trim()).update(payload).digest("base64url");
  const valid = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isInteger(data.userId) && data.userId > 0 && data.expiresAt > Date.now() ? data.userId : null;
  } catch {
    return null;
  }
}

/**
 * Initiates the Google OAuth2 flow by returning the authorization URL.
 */
export async function getGoogleAuthUrl(req: AuthRequest, res: Response) {
  try {
    const oauth2Client = getOAuthClient();

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly"
      ],
      prompt: "consent",
      state: createOAuthState(req.userId!)
    });

    res.json({ url });
  } catch (error) {
    console.error("Error generating OAuth URL:", error);
    const message = error instanceof Error ? error.message : "Google Calendar unavailable";
    res.status(message.includes("not configured") ? 503 : 500).json({ error: message });
  }
}

/**
 * Handles the Google OAuth redirect and exchanges code for tokens.
 */
export async function handleGoogleCallback(req: Request, res: Response) {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send("Missing authentication callback parameters");
  }

  try {
    const userId = getUserIdFromOAuthState(state as string);
    if (!userId) return res.status(400).send("The calendar authorization request has expired. Please try again.");

    const oauth2Client = getOAuthClient();

    const { tokens } = await oauth2Client.getToken(code as string);
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresAt = new Date(tokens.expiry_date || (Date.now() + 3600 * 1000));

    if (!accessToken) {
      return res.status(400).send("Failed to retrieve access token from Google");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(400).send("The signed-in user no longer exists.");

    // Save tokens securely in Database, ensuring refreshToken is preserved if not returned in a re-auth
    const existingAccount = await prisma.googleAccount.findUnique({
      where: { userId: user.id }
    });

    const tokenData = {
      accessToken,
      refreshToken: refreshToken || existingAccount?.refreshToken || "",
      expiresAt
    };

    if (!tokenData.refreshToken) {
      return res.status(400).send("Google Calendar refresh token is missing. Please remove ToDone from your Google Security account settings and re-sync.");
    }

    await prisma.googleAccount.upsert({
      where: { userId: user.id },
      update: tokenData,
      create: {
        userId: user.id,
        ...tokenData
      }
    });

    // Redirect user back to the webapp dashboard
    res.redirect(`${process.env.APP_URL || "http://localhost:5173"}/?sync=success`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.status(500).send("Google Calendar authentication failed.");
  }
}

/**
 * Handles errors and formats response appropriately.
 */
function handleControllerError(err: any, res: Response) {
  console.error("Calendar Controller Error:", err);
  if (err.status === 401 || err.message === "Google Link Required" || err.message === "Google Re-auth Required") {
    return res.status(401).json({ error: "Google Link Required" });
  }
  res.status(500).json({ error: "Google Calendar unavailable" });
}

/**
 * Get all calendar events from one year ago through one year ahead.
 */
export async function getEvents(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const headerToken = req.headers["x-google-token"] as string | undefined;
  try {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1); // 1 year ago

    const end = new Date();
    end.setFullYear(end.getFullYear() + 1); // 1 year from now

    const events = await getEventsBetween(userId, start, end, headerToken);
    res.json(events);
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Get calculated free time slots for today.
 */
export async function getTodayFreeTime(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const headerToken = req.headers["x-google-token"] as string | undefined;
  try {
    const slots = await getFreeTime(userId, headerToken);
    res.json(slots);
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Create a new event.
 */
export async function createEvent(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { title, description, start, end } = req.body;
  const headerToken = req.headers["x-google-token"] as string | undefined;

  if (!title || typeof title !== "string" || !start || !end) {
    return res.status(400).json({ error: "Invalid parameters: title, start, and end are required" });
  }

  try {
    const event = await addEvent(userId, { title, description, start, end }, headerToken);
    res.status(201).json(event);
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Update an existing event.
 */
export async function editEvent(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const eventId = typeof req.params.id === "string" ? req.params.id : undefined;
  const { title, description, start, end } = req.body;
  const headerToken = req.headers["x-google-token"] as string | undefined;

  if (!eventId || !title || typeof title !== "string" || !start || !end) {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  try {
    const event = await updateEvent(userId, eventId, { title, description, start, end }, headerToken);
    res.json(event);
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Delete an event.
 */
export async function removeEvent(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const eventId = typeof req.params.id === "string" ? req.params.id : undefined;
  const headerToken = req.headers["x-google-token"] as string | undefined;

  if (!eventId) {
    return res.status(400).json({ error: "Missing event ID" });
  }

  try {
    await deleteEvent(userId, eventId, headerToken);
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Check if the user has completed Google Calendar authentication.
 */
export async function getCalendarStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const headerToken = req.headers["x-google-token"] as string | undefined;
    if (headerToken) {
      return res.json({ synced: true });
    }
    const account = await prisma.googleAccount.findUnique({
      where: { userId }
    });
    return res.json({ synced: !!account });
  } catch (error) {
    console.error("Failed to get calendar status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
