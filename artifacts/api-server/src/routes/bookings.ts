import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import {
  CreateBookingBody,
  ListBookingsQueryParams,
  GetBookingParams,
  UpdateBookingParams,
  UpdateBookingBody,
  DeleteBookingParams,
} from "@workspace/api-zod";
import { sendBookingConfirmation } from "../lib/email";

const router: IRouter = Router();

type BookingRow = typeof bookingsTable.$inferSelect;

function formatBooking(b: BookingRow) {
  const { updatedAt: _updatedAt, ...rest } = b;
  return {
    ...rest,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  };
}

router.get("/bookings/upcoming", async (_req, res): Promise<void> => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split("T")[0];
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        gte(bookingsTable.serviceDate, todayStr),
        lte(bookingsTable.serviceDate, nextWeekStr)
      )
    )
    .orderBy(bookingsTable.serviceDate);

  res.json(bookings.map(formatBooking));
});

router.get("/bookings", async (req, res): Promise<void> => {
  const query = ListBookingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(query.data.status ? eq(bookingsTable.status, query.data.status) : undefined)
    .orderBy(bookingsTable.createdAt);

  res.json(bookings.map(formatBooking));
});

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  // CreateBookingBody intentionally leaves email as a plain string (orval emits
  // broken Zod-v4 syntax for `format: email`), so validate the format here.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
    res.status(400).json({ error: "customerEmail must be a valid email address" });
    return;
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      address: data.address,
      city: data.city ?? "Toronto",
      postalCode: data.postalCode ?? "",
      serviceDate: data.serviceDate,
      serviceTime: data.serviceTime,
      loadSize: data.loadSize,
      isBusiness: data.isBusiness ?? false,
      businessName: data.isBusiness ? (data.businessName ?? null) : null,
      notes: data.notes ?? null,
      status: "pending",
    })
    .returning();

  // Fire the instant confirmation email; a failure must never block the booking,
  // but it must be loudly visible in the logs.
  sendBookingConfirmation(booking)
    .then((result) => {
      if (result.sent) {
        req.log.info({ bookingId: booking.id, to: booking.customerEmail }, "Confirmation email sent");
      } else {
        req.log.error({ bookingId: booking.id, reason: result.reason }, "Confirmation email NOT sent");
      }
    })
    .catch((err) => {
      req.log.error({ err, bookingId: booking.id }, "Confirmation email failed");
    });

  res.status(201).json(formatBooking(booking));
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, params.data.id));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json(formatBooking(booking));
});

router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const params = UpdateBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<BookingRow> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.serviceDate !== undefined) updates.serviceDate = parsed.data.serviceDate;
  if (parsed.data.serviceTime !== undefined) updates.serviceTime = parsed.data.serviceTime;
  if (parsed.data.loadSize !== undefined) updates.loadSize = parsed.data.loadSize;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [booking] = await db
    .update(bookingsTable)
    .set(updates)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json(formatBooking(booking));
});

router.delete("/bookings/:id", async (req, res): Promise<void> => {
  const params = DeleteBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(bookingsTable)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.status(204).send();
});

export default router;
