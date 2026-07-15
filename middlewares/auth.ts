import { Request, Response, NextFunction } from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
  name?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.substring(7);
  const userId = parseInt(token, 10);
  if (isNaN(userId)) {
    return res.status(401).json({ error: "Unauthorized: Invalid token format" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }

    req.userId = user.id;
    req.username = user.username;
    req.name = user.name;
    next();
  } catch (error) {
    console.error("Auth verification failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid user session" });
  }
}
