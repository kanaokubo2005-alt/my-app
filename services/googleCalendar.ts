import { OAuth2Client } from "google-auth-library";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  color?: string;
  textColor?: string;
}

export interface FreeTimeSlot {
  start: string;
  end: string;
}

/**
 * Gets a fresh, valid Google Access Token for the user, refreshing it if expired.
 */
export async function getFreshAccessToken(userId: number): Promise<string> {
  const account = await prisma.googleAccount.findUnique({
    where: { userId }
  });

  if (!account) {
    const error = new Error("Google Link Required");
    (error as any).status = 401;
    throw error;
  }

  // If token is expired or expiring in less than 5 minutes, refresh it
  if (account.expiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
    try {
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: account.refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      const accessToken = credentials.access_token;
      if (!accessToken) throw new Error("No access token returned from Google refresh");

      const expiresAt = new Date(credentials.expiry_date || (Date.now() + 3600 * 1000));

      await prisma.googleAccount.update({
        where: { userId },
        data: {
          accessToken,
          expiresAt
        }
      });

      return accessToken;
    } catch (err) {
      console.error("Failed to refresh Google access token:", err);
      const error = new Error("Google Re-auth Required");
      (error as any).status = 401;
      throw error;
    }
  }

  return account.accessToken;
}

/**
 * Helper to resolve the access token (either from header or database refresh).
 */
export async function getAccessToken(userId: number, headerToken?: string): Promise<string> {
  if (headerToken) {
    return headerToken;
  }
  return getFreshAccessToken(userId);
}

/**
 * Get Google Calendar events within a specified range
 */
export async function getEventsBetween(
  userId: number,
  start: Date,
  end: Date,
  headerToken?: string
): Promise<GoogleCalendarEvent[]> {
  const token = await getAccessToken(userId, headerToken);
  const headers = { Authorization: `Bearer ${token}` };
  const [calendarResult, colorsResult] = await Promise.allSettled([
    fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList/primary", { headers }),
    fetch("https://www.googleapis.com/calendar/v3/colors", { headers }),
  ]);
  const calendar = calendarResult.status === "fulfilled" && calendarResult.value.ok
    ? await calendarResult.value.json() as any
    : null;
  const colors = colorsResult.status === "fulfilled" && colorsResult.value.ok
    ? await colorsResult.value.json() as any
    : null;

  const items: any[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers });
    if (!res.ok) {
      if (res.status === 401) {
        const error = new Error("Google Re-auth Required");
        (error as any).status = 401;
        throw error;
      }
      throw new Error("Google Calendar unavailable");
    }
    const data: any = await res.json();
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items.map((item: any) => ({
    id: item.id,
    title: item.summary || "予定",
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    location: item.location || "",
    description: item.description || "",
    color: item.colorId ? colors?.event?.[item.colorId]?.background : calendar?.backgroundColor,
    textColor: item.colorId ? colors?.event?.[item.colorId]?.foreground : calendar?.foregroundColor,
  }));
}

/**
 * Get events for today
 */
export async function getTodayEvents(userId: number, headerToken?: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return getEventsBetween(userId, start, end, headerToken);
}

/**
 * Get events for tomorrow
 */
export async function getTomorrowEvents(userId: number, headerToken?: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
  return getEventsBetween(userId, start, end, headerToken);
}

/**
 * Calculate the user's free time today between 08:00 and 22:00
 */
export async function getFreeTime(userId: number, headerToken?: string): Promise<FreeTimeSlot[]> {
  const events = await getTodayEvents(userId, headerToken);
  
  // Define active day range: 08:00 to 22:00 local time
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0);

  // Parse events into absolute start and end Date objects, clipped to active day hours
  const busyIntervals: Array<{ start: Date; end: Date }> = [];

  for (const event of events) {
    if (!event.start || !event.end) continue;
    const estart = new Date(event.start);
    const eend = new Date(event.end);

    // Skip all-day events or events entirely outside our active range
    if (isNaN(estart.getTime()) || isNaN(eend.getTime())) continue;
    if (eend <= dayStart || estart >= dayEnd) continue;

    // Clip events to the active bounds
    const clipStart = estart < dayStart ? dayStart : estart;
    const clipEnd = eend > dayEnd ? dayEnd : eend;

    if (clipStart < clipEnd) {
      busyIntervals.push({ start: clipStart, end: clipEnd });
    }
  }

  // Sort busy intervals by start time
  busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge overlapping busy intervals
  const mergedBusy: Array<{ start: Date; end: Date }> = [];
  for (const interval of busyIntervals) {
    if (mergedBusy.length === 0) {
      mergedBusy.push(interval);
    } else {
      const last = mergedBusy[mergedBusy.length - 1];
      if (interval.start <= last.end) {
        // Overlap, merge them
        if (interval.end > last.end) {
          last.end = interval.end;
        }
      } else {
        mergedBusy.push(interval);
      }
    }
  }

  // Calculate free time slots
  const freeSlots: FreeTimeSlot[] = [];
  const formatTime = (d: Date) => {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  let currentStart = dayStart;
  for (const busy of mergedBusy) {
    if (busy.start > currentStart) {
      // Slot exists
      freeSlots.push({
        start: formatTime(currentStart),
        end: formatTime(busy.start)
      });
    }
    currentStart = busy.end > currentStart ? busy.end : currentStart;
  }

  if (currentStart < dayEnd) {
    freeSlots.push({
      start: formatTime(currentStart),
      end: formatTime(dayEnd)
    });
  }

  return freeSlots;
}

/**
 * Add a new event to Google Calendar
 */
export async function addEvent(
  userId: number,
  event: { title: string; description?: string; start: string; end: string },
  headerToken?: string
): Promise<GoogleCalendarEvent> {
  const token = await getAccessToken(userId, headerToken);
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  const body = {
    summary: event.title,
    description: event.description || "",
    start: { dateTime: new Date(event.start).toISOString() },
    end: { dateTime: new Date(event.end).toISOString() }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error("Failed to create event in Google Calendar");
  }

  const item: any = await res.json();
  return {
    id: item.id,
    title: item.summary || "予定",
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    location: item.location || "",
    description: item.description || ""
  };
}

/**
 * Update an existing event in Google Calendar
 */
export async function updateEvent(
  userId: number,
  eventId: string,
  event: { title: string; description?: string; start: string; end: string },
  headerToken?: string
): Promise<GoogleCalendarEvent> {
  const token = await getAccessToken(userId, headerToken);
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

  const body = {
    summary: event.title,
    description: event.description || "",
    start: { dateTime: new Date(event.start).toISOString() },
    end: { dateTime: new Date(event.end).toISOString() }
  };

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error("Failed to update event in Google Calendar");
  }

  const item: any = await res.json();
  return {
    id: item.id,
    title: item.summary || "予定",
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    location: item.location || "",
    description: item.description || ""
  };
}

/**
 * Delete an event in Google Calendar
 */
export async function deleteEvent(userId: number, eventId: string, headerToken?: string): Promise<void> {
  const token = await getAccessToken(userId, headerToken);
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok && res.status !== 404) {
    throw new Error("Failed to delete event in Google Calendar");
  }
}
