import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, bookingsTable, servicesTable, subscribersTable } from "@workspace/db";
import {
  CreateBookingBody,
  ListBookingsQueryParams,
  GetBookingParams,
  UpdateBookingParams,
  UpdateBookingBody,
  DeleteBookingParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

type BookingRow = {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  postalCode: string;
  serviceDate: string;
  serviceTime: string;
  serviceId: number;
  serviceName?: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: string | null;
  notes: string | null;
  createdAt: Date;
};

function formatBooking(b: BookingRow) {
  return {
    ...b,
    totalAmount: b.totalAmount ? parseFloat(b.totalAmount) : null,
    serviceName: b.serviceName ?? null,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  };
}

const bookingSelectFields = {
  id: bookingsTable.id,
  customerName: bookingsTable.customerName,
  customerEmail: bookingsTable.customerEmail,
  customerPhone: bookingsTable.customerPhone,
  address: bookingsTable.address,
  city: bookingsTable.city,
  postalCode: bookingsTable.postalCode,
  serviceDate: bookingsTable.serviceDate,
  serviceTime: bookingsTable.serviceTime,
  serviceId: bookingsTable.serviceId,
  serviceName: servicesTable.name,
  status: bookingsTable.status,
  paymentStatus: bookingsTable.paymentStatus,
  totalAmount: bookingsTable.totalAmount,
  notes: bookingsTable.notes,
  createdAt: bookingsTable.createdAt,
} as const;

router.get("/bookings/upcoming", async (_req, res): Promise<void> => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split("T")[0];
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  const bookings = await db
    .select(bookingSelectFields)
    .from(bookingsTable)
    .leftJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
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

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(bookingsTable.status, query.data.status));
  }
  if (query.data.paymentStatus) {
    conditions.push(eq(bookingsTable.paymentStatus, query.data.paymentStatus));
  }

  const bookings = await db
    .select(bookingSelectFields)
    .from(bookingsTable)
    .leftJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
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

  const insertValues: Parameters<typeof db.insert>[0] extends never
    ? never
    : {
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        address: string;
        city: string;
        postalCode: string;
        serviceDate: string;
        serviceTime: string;
        serviceId?: number;
        status: string;
        paymentStatus: string;
        notes?: string | null;
      } = {
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    address: data.address,
    city: data.city ?? "Toronto",
    postalCode: data.postalCode ?? "",
    serviceDate: data.serviceDate,
    serviceTime: data.serviceTime,
    status: "pending",
    paymentStatus: "unpaid",
    notes: data.notes ?? null,
  };

  if (data.serviceId != null) {
    insertValues.serviceId = data.serviceId;
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values(insertValues)
    .returning();

  // Optionally subscribe to newsletter
  if (data.subscribeToNewsletter && data.customerEmail) {
    try {
      await db
        .insert(subscribersTable)
        .values({ email: data.customerEmail, name: data.customerName })
        .onConflictDoNothing();
    } catch {
      // ignore duplicate subscriber errors
    }
  }

  const serviceName =
    data.serviceId != null
      ? await db
          .select({ name: servicesTable.name })
          .from(servicesTable)
          .where(eq(servicesTable.id, data.serviceId))
          .then((r) => r[0]?.name ?? null)
      : null;

  res.status(201).json(
    formatBooking({
      ...booking,
      serviceName,
      totalAmount: booking.totalAmount ?? null,
    })
  );
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db
    .select(bookingSelectFields)
    .from(bookingsTable)
    .leftJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
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

  const body = UpdateBookingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.status !== undefined) updateData.status = body.data.status;
  if (body.data.paymentStatus !== undefined) updateData.paymentStatus = body.data.paymentStatus;
  if (body.data.totalAmount !== undefined) updateData.totalAmount = String(body.data.totalAmount);
  if (body.data.notes !== undefined) updateData.notes = body.data.notes;

  const [booking] = await db
    .update(bookingsTable)
    .set(updateData)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const serviceName =
    booking.serviceId != null
      ? await db
          .select({ name: servicesTable.name })
          .from(servicesTable)
          .where(eq(servicesTable.id, booking.serviceId))
          .then((r) => r[0]?.name ?? null)
      : null;

  res.json(
    formatBooking({
      ...booking,
      serviceName,
      totalAmount: booking.totalAmount ?? null,
      createdAt: booking.createdAt,
    })
  );
});

router.delete("/bookings/:id", async (req, res): Promise<void> => {
  const params = DeleteBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db
    .delete(bookingsTable)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
