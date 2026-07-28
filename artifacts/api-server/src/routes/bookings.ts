import { Router, type IRouter } from "express";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import {
  CreateBookingBody,
  ListBookingsQueryParams,
  GetBookingParams,
  UpdateBookingParams,
  UpdateBookingBody,
  DeleteBookingParams,
} from "@workspace/api-zod";
import {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendBookingReschedule,
} from "../lib/email";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  verifyBookingManageToken,
  bookingManageUrl,
} from "../lib/unsubscribe";
import { validateSchedule } from "../lib/availability";

const router: IRouter = Router();

type BookingRow = typeof bookingsTable.$inferSelect;

function formatBooking(b: BookingRow) {
  const { updatedAt: _updatedAt, ...rest } = b;
  return {
    ...rest,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  };
}

router.get("/bookings/upcoming", requireAdmin, async (_req, res): Promise<void> => {
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

router.get("/bookings", requireAdmin, async (req, res): Promise<void> => {
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

  const scheduleError = await validateSchedule(data.serviceDate, data.serviceTime);
  if (scheduleError) {
    res.status(400).json({ error: scheduleError });
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

  res.status(201).json({ ...formatBooking(booking), manageUrl: bookingManageUrl(booking.id, booking.customerEmail) });
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

  // Bookings contain PII — only the admin or someone holding the signed
  // manage token (from the confirmation email / success page) may view one.
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const isAdmin = req.session.isAdmin === true;
  const hasValidToken =
    token.length > 0 && verifyBookingManageToken(booking.id, booking.customerEmail, token);
  if (!isAdmin && !hasValidToken) {
    res.status(403).json({ error: "Not authorized to view this booking" });
    return;
  }

  res.json(formatBooking(booking));
});

router.patch("/bookings/:id", requireAdmin, async (req, res): Promise<void> => {
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

  const [existing] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const [booking] = await db
    .update(bookingsTable)
    .set(updates)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  // Instant transactional emails. Failures must never block the update,
  // but they must be loudly visible in the logs.
  const becameCancelled = booking.status === "cancelled" && existing.status !== "cancelled";
  const timingChanged =
    booking.serviceDate !== existing.serviceDate || booking.serviceTime !== existing.serviceTime;
  const isActive = booking.status === "pending" || booking.status === "confirmed";

  if (becameCancelled) {
    sendBookingCancellation(booking)
      .then((result) => {
        if (result.sent) {
          req.log.info({ bookingId: booking.id, to: booking.customerEmail }, "Cancellation email sent");
        } else {
          req.log.error({ bookingId: booking.id, reason: result.reason }, "Cancellation email NOT sent");
        }
      })
      .catch((err) => {
        req.log.error({ err, bookingId: booking.id }, "Cancellation email failed");
      });
  } else if (timingChanged && isActive) {
    sendBookingReschedule(booking, {
      serviceDate: existing.serviceDate,
      serviceTime: existing.serviceTime,
    })
      .then((result) => {
        if (result.sent) {
          req.log.info({ bookingId: booking.id, to: booking.customerEmail }, "Reschedule email sent");
        } else {
          req.log.error({ bookingId: booking.id, reason: result.reason }, "Reschedule email NOT sent");
        }
      })
      .catch((err) => {
        req.log.error({ err, bookingId: booking.id }, "Reschedule email failed");
      });
  }

  res.json(formatBooking(booking));
});

router.post("/bookings/:id/manage", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid booking id" }); return; }

  const { token, action, serviceDate, serviceTime } = req.body ?? {};
  if (!token || typeof token !== "string") { res.status(400).json({ error: "token is required" }); return; }
  if (action !== "cancel" && action !== "reschedule") { res.status(400).json({ error: "action must be cancel or reschedule" }); return; }

  const [existing] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Booking not found" }); return; }

  if (!verifyBookingManageToken(existing.id, existing.customerEmail, token)) {
    res.status(403).json({ error: "Invalid or expired link" });
    return;
  }

  if (existing.status === "cancelled" || existing.status === "completed") {
    res.status(400).json({ error: `Booking is already ${existing.status}` });
    return;
  }

  let updates: Partial<BookingRow> = {};
  if (action === "cancel") {
    updates.status = "cancelled";
  } else {
    if (typeof serviceDate !== "string" || typeof serviceTime !== "string") {
      res.status(400).json({ error: "serviceDate and serviceTime are required for reschedule" });
      return;
    }
    const scheduleError = await validateSchedule(serviceDate, serviceTime);
    if (scheduleError) {
      res.status(400).json({ error: scheduleError });
      return;
    }
    updates.serviceDate = serviceDate;
    updates.serviceTime = serviceTime;
  }

  // Atomic guard: only transition bookings that are still active, so two
  // concurrent requests can't both cancel/reschedule (and double-send emails).
  const [booking] = await db
    .update(bookingsTable)
    .set(updates)
    .where(
      and(
        eq(bookingsTable.id, params.data.id),
        inArray(bookingsTable.status, ["pending", "confirmed"])
      )
    )
    .returning();

  if (!booking) {
    res.status(400).json({ error: "Booking can no longer be changed — please reload the page" });
    return;
  }

  const becameCancelled = action === "cancel";
  const timingChanged = action === "reschedule";

  if (becameCancelled) {
    sendBookingCancellation(booking)
      .then((r) => req.log.info({ bookingId: booking.id, sent: r.sent }, "Self-service cancellation email"))
      .catch((err) => req.log.error({ err }, "Self-service cancellation email failed"));
  } else if (timingChanged) {
    sendBookingReschedule(booking, { serviceDate: existing.serviceDate, serviceTime: existing.serviceTime })
      .then((r) => req.log.info({ bookingId: booking.id, sent: r.sent }, "Self-service reschedule email"))
      .catch((err) => req.log.error({ err }, "Self-service reschedule email failed"));
  }

  res.json({ ...formatBooking(booking), manageUrl: bookingManageUrl(booking.id, booking.customerEmail) });
});

router.delete("/bookings/:id", requireAdmin, async (req, res): Promise<void> => {
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
