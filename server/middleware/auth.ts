import { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  userId?: string;
}

export function extractUserId(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: missing x-user-id header" });
  }
  req.userId = userId;
  next();
}
