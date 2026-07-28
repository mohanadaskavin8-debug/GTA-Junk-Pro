import { pgTable, text, serial, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Truck load sizes, smallest to largest. */
export const LOAD_SIZES = [
  "small",
  "1/8",
  "1/6",
  "1/4",
  "1/3",
  "3/8",
  "1/2",
  "5/8",
  "2/3",
  "3/4",
  "5/6",
  "7/8",
  "full",
] as const;
export type LoadSize = (typeof LOAD_SIZES)[number];

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull().default("Toronto"),
  postalCode: text("postal_code").notNull().default(""),
  /** Date of the free in-person estimate. */
  serviceDate: date("service_date", { mode: "string" }).notNull(),
  /** 2-hour arrival window, e.g. "08:00 AM - 10:00 AM". */
  serviceTime: text("service_time").notNull(),
  /** Estimated truck load size chosen by the customer. */
  loadSize: text("load_size").notNull().default("small"),
  isBusiness: boolean("is_business").notNull().default(false),
  businessName: text("business_name"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
