import { Request, Response, NextFunction } from "express";
import { getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Initialize firebase-admin in ESM
let app: App;
if (getApps().length === 0) {
  app = initializeApp({
    projectId: "todone-1ae64",
  });
} else {
  app = getApps()[0];
}

const auth = getAuth(app);

export interface AuthRequest extends Request {
  userId?: number;
  firebaseUid?: string;
  userEmail?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    // Auto-create or find Prisma User linked to this firebaseUid
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: decodedToken.uid,
          name: decodedToken.name || decodedToken.email?.split("@")[0] || "User",
        }
      });
    }

    req.userId = user.id;
    req.firebaseUid = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    console.error("Firebase Auth verification failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}
