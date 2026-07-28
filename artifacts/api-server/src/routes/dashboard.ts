import { Router, type IRouter } from "express";
import { eq, gte, and, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, bookingsTable, subscribersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const [
    totalResult,
    pendingResult,
    confirmedResult,
    completedResult,
    cancelledResult,
    unpaidResult,
    paidResult,
    subscriberResult,
    revenueResult,
    pendingRevenueResult,
    todayResult,
    weekResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "confirmed")),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "completed")),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "cancelled")),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.paymentStatus, "unpaid")),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.paymentStatus, "paid")),
    db.select({ count: sql<number>`count(*)` }).from(subscribersTable),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(bookingsTable).where(eq(bookingsTable.paymentStatus, "paid")),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(bookingsTable).where(and(eq(bookingsTable.paymentStatus, "unpaid"), eq(bookingsTable.status, "confirmed"))),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.serviceDate, today)),
    db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(and(gte(bookingsTable.serviceDate, weekStartStr), lte(bookingsTable.serviceDate, today))),
  ]);

  res.json({
    totalBookings: Number(totalResult[0]?.count ?? 0),
    pendingBookings: Number(pendingResult[0]?.count ?? 0),
    confirmedBookings: Number(confirmedResult[0]?.count ?? 0),
    completedBookings: Number(completedResult[0]?.count ?? 0),
    cancelledBookings: Number(cancelledResult[0]?.count ?? 0),
    unpaidBookings: Number(unpaidResult[0]?.count ?? 0),
    paidBookings: Number(paidResult[0]?.count ?? 0),
    totalSubscribers: Number(subscriberResult[0]?.count ?? 0),
    totalRevenue: Number(revenueResult[0]?.total ?? 0),
    pendingRevenue: Number(pendingRevenueResult[0]?.total ?? 0),
    bookingsToday: Number(todayResult[0]?.count ?? 0),
    bookingsThisWeek: Number(weekResult[0]?.count ?? 0),
  });
});

export default router;
