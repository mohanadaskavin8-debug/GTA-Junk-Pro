import { Router, type IRouter } from "express";
import { eq, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, bookingsTable, subscribersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalResult,
    pendingResult,
    confirmedResult,
    completedResult,
    cancelledResult,
    subscriberResult,
    todayResult,
    weekResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "confirmed")),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "completed")),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "cancelled")),
    db.select({ count: sql<number>`count(*)` }).from(subscribersTable),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.serviceDate, today)),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(gte(bookingsTable.createdAt, weekStart)),
  ]);

  res.json({
    totalBookings: Number(totalResult[0].count),
    pendingBookings: Number(pendingResult[0].count),
    confirmedBookings: Number(confirmedResult[0].count),
    completedBookings: Number(completedResult[0].count),
    cancelledBookings: Number(cancelledResult[0].count),
    totalSubscribers: Number(subscriberResult[0].count),
    bookingsToday: Number(todayResult[0].count),
    bookingsThisWeek: Number(weekResult[0].count),
  });
});

export default router;
