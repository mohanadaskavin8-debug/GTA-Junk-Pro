import { Resend } from "resend";
import { inArray } from "drizzle-orm";
import { db, settingsTable, bookingsTable } from "@workspace/db";
import { publicBaseUrl, unsubscribeUrl } from "./unsubscribe";

type BookingRow = typeof bookingsTable.$inferSelect;

export type EmailResult = { sent: true } | { sent: false; reason: string };

const DEFAULT_FROM = "Piece of Cake Junk <onboarding@resend.dev>";

const BRAND_PURPLE = "#7c3aed";
const BRAND_PURPLE_DARK = "#5b21b6";
const BRAND_YELLOW = "#facc15";
const PHONE = "437-775-9626";

interface EmailSettings {
  from: string;
  replyTo?: string;
}

async function getEmailSettings(): Promise<EmailSettings> {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(inArray(settingsTable.key, ["emailFromAddress", "businessEmail"]));

  const from =
    rows.find((r) => r.key === "emailFromAddress")?.value?.trim() || DEFAULT_FROM;
  const replyTo = rows.find((r) => r.key === "businessEmail")?.value?.trim();
  return { from, ...(replyTo ? { replyTo } : {}) };
}

function loadSizeLabel(loadSize: string): string {
  if (loadSize === "small") return "Small Load";
  if (loadSize === "full") return "Full Load";
  return `${loadSize} Truck Load`;
}

/** Format "yyyy-MM-dd" without timezone surprises. */
function formatEstimateDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bookingRef(booking: BookingRow): string {
  return `POC-${booking.id.toString().padStart(4, "0")}`;
}

function fullAddressOf(booking: BookingRow): string {
  return [booking.address, booking.city, booking.postalCode].filter(Boolean).join(", ");
}

function detailRow(label: string, value: string, options?: { muted?: boolean }): string {
  const valueStyle = options?.muted
    ? "color:#9ca3af;font-size:14px;font-weight:500;text-align:right;text-decoration:line-through;"
    : "color:#111827;font-size:14px;font-weight:700;text-align:right;";
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee9fb;color:#6b7280;font-size:14px;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee9fb;${valueStyle}">${value}</td>
    </tr>`;
}

interface BrandedEmailOptions {
  badge: string;
  heading: string;
  intro: string;
  contentHtml: string;
  footerHtml?: string;
}

/** Shared branded shell used by every email we send. */
function brandedEmail(options: BrandedEmailOptions): string {
  return `
  <div style="background:#f4f1fa;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <div style="background:${BRAND_PURPLE};background:linear-gradient(135deg,${BRAND_PURPLE},${BRAND_PURPLE_DARK});padding:32px 32px 28px;">
        <div style="display:inline-block;background:${BRAND_YELLOW};color:#3b2b00;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:999px;padding:6px 14px;margin-bottom:16px;">${options.badge}</div>
        <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.25;">${options.heading}</h1>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:15px;line-height:1.5;">
          ${options.intro}
        </p>
      </div>
      <div style="padding:28px 32px;">
        ${options.contentHtml}
      </div>
      <div style="background:#faf9fd;border-top:1px solid #eee9fb;padding:18px 32px;text-align:center;">
        ${options.footerHtml ?? `<p style="margin:0;color:#9ca3af;font-size:12px;">Piece of Cake Junk Removal &bull; Greater Toronto Area</p>`}
      </div>
    </div>
  </div>`;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send(args: SendArgs): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured" };
  }

  const resend = new Resend(apiKey);
  const settings = await getEmailSettings();

  try {
    const { error } = await resend.emails.send({
      from: settings.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      ...(settings.replyTo ? { replyTo: settings.replyTo } : {}),
    });
    if (error) {
      return { sent: false, reason: error.message ?? JSON.stringify(error) };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Transactional: booking confirmation ─────────────────────────────────────

export async function sendBookingConfirmation(booking: BookingRow): Promise<EmailResult> {
  const ref = bookingRef(booking);
  const dateLabel = formatEstimateDate(booking.serviceDate);
  const load = loadSizeLabel(booking.loadSize);
  const firstName = escapeHtml(booking.customerName.split(" ")[0] || booking.customerName);
  const fullAddress = fullAddressOf(booking);

  const contentHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${detailRow("Reference", ref)}
      ${detailRow("Estimate Date", escapeHtml(dateLabel))}
      ${detailRow("Arrival Window", escapeHtml(booking.serviceTime))}
      ${detailRow("Estimated Load", escapeHtml(load))}
      ${detailRow("Pickup Address", escapeHtml(fullAddress))}
      ${booking.isBusiness && booking.businessName ? detailRow("Business", escapeHtml(booking.businessName)) : ""}
    </table>
    <div style="background:#f9f7fe;border:1px solid #eee9fb;border-radius:12px;padding:18px 20px;margin-top:24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        <strong style="color:${BRAND_PURPLE_DARK};">What happens next?</strong><br/>
        Our team arrives during your window, takes a quick look, and gives you an exact, all-inclusive price on the spot.
        No pressure, no obligation &mdash; and if you like the price, we can haul everything away right then and there.
      </p>
    </div>
    <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
      Need to make a change? Just reply to this email or call us at <strong style="color:#111827;">${PHONE}</strong>.
    </p>`;

  const html = brandedEmail({
    badge: "Free Estimate Booked",
    heading: `You're all set, ${firstName}!`,
    intro:
      "Your no-obligation in-person estimate is confirmed. We always come ready to provide same-day removal if you'd like us to proceed.",
    contentHtml,
  });

  const text = [
    `You're all set, ${booking.customerName}!`,
    ``,
    `Your no-obligation in-person estimate is confirmed. We always come ready to provide same-day removal if you'd like us to proceed.`,
    ``,
    `Reference: ${ref}`,
    `Estimate Date: ${dateLabel}`,
    `Arrival Window: ${booking.serviceTime}`,
    `Estimated Load: ${load}`,
    `Pickup Address: ${fullAddress}`,
    booking.isBusiness && booking.businessName ? `Business: ${booking.businessName}` : "",
    ``,
    `What happens next? Our team arrives during your window, takes a quick look, and gives you an exact, all-inclusive price on the spot. No pressure, no obligation - and if you like the price, we can haul everything away right then and there.`,
    ``,
    `Need to make a change? Reply to this email or call ${PHONE}.`,
    `Piece of Cake Junk Removal - Greater Toronto Area`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return send({
    to: booking.customerEmail,
    subject: `Your Free Estimate is Booked - ${ref} | Piece of Cake Junk`,
    html,
    text,
  });
}

// ── Transactional: booking rescheduled ───────────────────────────────────────

export interface PreviousTiming {
  serviceDate: string;
  serviceTime: string;
}

export async function sendBookingReschedule(
  booking: BookingRow,
  previous: PreviousTiming
): Promise<EmailResult> {
  const ref = bookingRef(booking);
  const newDate = formatEstimateDate(booking.serviceDate);
  const oldDate = formatEstimateDate(previous.serviceDate);
  const firstName = escapeHtml(booking.customerName.split(" ")[0] || booking.customerName);
  const fullAddress = fullAddressOf(booking);

  const contentHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${detailRow("Reference", ref)}
      ${detailRow("New Estimate Date", escapeHtml(newDate))}
      ${detailRow("New Arrival Window", escapeHtml(booking.serviceTime))}
      ${detailRow("Previously", `${escapeHtml(oldDate)} &bull; ${escapeHtml(previous.serviceTime)}`, { muted: true })}
      ${detailRow("Pickup Address", escapeHtml(fullAddress))}
    </table>
    <div style="background:#f9f7fe;border:1px solid #eee9fb;border-radius:12px;padding:18px 20px;margin-top:24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        <strong style="color:${BRAND_PURPLE_DARK};">Nothing else changes.</strong><br/>
        Our team arrives during your new window, takes a quick look, and gives you an exact, all-inclusive price on the spot.
        Same-day removal is always available if you'd like us to proceed.
      </p>
    </div>
    <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
      Doesn't work for you? Just reply to this email or call us at <strong style="color:#111827;">${PHONE}</strong> and we'll find a better time.
    </p>`;

  const html = brandedEmail({
    badge: "Estimate Rescheduled",
    heading: `New time confirmed, ${firstName}!`,
    intro: "Your free in-person estimate has been moved. Here are your updated details.",
    contentHtml,
  });

  const text = [
    `New time confirmed, ${booking.customerName}!`,
    ``,
    `Your free in-person estimate has been moved. Here are your updated details.`,
    ``,
    `Reference: ${ref}`,
    `New Estimate Date: ${newDate}`,
    `New Arrival Window: ${booking.serviceTime}`,
    `Previously: ${oldDate} - ${previous.serviceTime}`,
    `Pickup Address: ${fullAddress}`,
    ``,
    `Doesn't work for you? Reply to this email or call ${PHONE} and we'll find a better time.`,
    `Piece of Cake Junk Removal - Greater Toronto Area`,
  ].join("\n");

  return send({
    to: booking.customerEmail,
    subject: `Your Estimate Was Rescheduled - ${ref} | Piece of Cake Junk`,
    html,
    text,
  });
}

// ── Transactional: booking cancelled ─────────────────────────────────────────

export async function sendBookingCancellation(booking: BookingRow): Promise<EmailResult> {
  const ref = bookingRef(booking);
  const dateLabel = formatEstimateDate(booking.serviceDate);
  const firstName = escapeHtml(booking.customerName.split(" ")[0] || booking.customerName);
  const fullAddress = fullAddressOf(booking);
  const bookUrl = `${publicBaseUrl()}/book`;

  const contentHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${detailRow("Reference", ref)}
      ${detailRow("Estimate Date", escapeHtml(dateLabel), { muted: true })}
      ${detailRow("Arrival Window", escapeHtml(booking.serviceTime), { muted: true })}
      ${detailRow("Pickup Address", escapeHtml(fullAddress))}
    </table>
    <div style="background:#f9f7fe;border:1px solid #eee9fb;border-radius:12px;padding:18px 20px;margin-top:24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        <strong style="color:${BRAND_PURPLE_DARK};">Changed your mind?</strong><br/>
        Junk has a way of piling back up. Whenever you're ready, we'll be there &mdash; booking a new free estimate takes about a minute.
      </p>
      <a href="${bookUrl}" style="display:inline-block;background:${BRAND_YELLOW};color:#3b2b00;font-size:14px;font-weight:700;border-radius:10px;padding:11px 22px;margin-top:14px;text-decoration:none;">Book a New Free Estimate</a>
    </div>
    <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
      Cancelled by mistake? Just reply to this email or call us at <strong style="color:#111827;">${PHONE}</strong> and we'll put it right back.
    </p>`;

  const html = brandedEmail({
    badge: "Estimate Cancelled",
    heading: `Your estimate is cancelled, ${firstName}`,
    intro:
      "Your free in-person estimate below has been cancelled. There's nothing owed and nothing more to do.",
    contentHtml,
  });

  const text = [
    `Your estimate is cancelled, ${booking.customerName}`,
    ``,
    `Your free in-person estimate below has been cancelled. There's nothing owed and nothing more to do.`,
    ``,
    `Reference: ${ref}`,
    `Estimate Date: ${dateLabel}`,
    `Arrival Window: ${booking.serviceTime}`,
    `Pickup Address: ${fullAddress}`,
    ``,
    `Changed your mind? Book a new free estimate anytime: ${bookUrl}`,
    `Cancelled by mistake? Reply to this email or call ${PHONE} and we'll put it right back.`,
    `Piece of Cake Junk Removal - Greater Toronto Area`,
  ].join("\n");

  return send({
    to: booking.customerEmail,
    subject: `Your Estimate is Cancelled - ${ref} | Piece of Cake Junk`,
    html,
    text,
  });
}

// ── Promotional: campaign broadcast ──────────────────────────────────────────

export interface CampaignEmailArgs {
  to: string;
  subject: string;
  body: string;
}

export async function sendCampaignEmail(args: CampaignEmailArgs): Promise<EmailResult> {
  const unsubUrl = unsubscribeUrl(args.to);
  const bookUrl = `${publicBaseUrl()}/book`;

  const paragraphs = escapeHtml(args.body.trim())
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">${p.replace(/\n/g, "<br/>")}</p>`
    )
    .join("");

  const contentHtml = `
    ${paragraphs}
    <div style="text-align:center;margin-top:28px;">
      <a href="${bookUrl}" style="display:inline-block;background:${BRAND_YELLOW};color:#3b2b00;font-size:15px;font-weight:700;border-radius:12px;padding:13px 28px;text-decoration:none;">Book a Free Estimate</a>
    </div>`;

  const footerHtml = `
    <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">Piece of Cake Junk Removal &bull; Greater Toronto Area &bull; ${PHONE}</p>
    <p style="margin:0;color:#9ca3af;font-size:12px;">
      You're receiving this because you subscribed to our updates and offers.
      <a href="${unsubUrl}" style="color:#7c3aed;text-decoration:underline;">Unsubscribe</a>
    </p>`;

  const html = brandedEmail({
    badge: "Piece of Cake Junk",
    heading: escapeHtml(args.subject),
    intro: "News and offers from your local junk removal crew.",
    contentHtml,
    footerHtml,
  });

  const text = [
    args.subject,
    ``,
    args.body.trim(),
    ``,
    `Book a free estimate: ${bookUrl}`,
    ``,
    `Piece of Cake Junk Removal - Greater Toronto Area - ${PHONE}`,
    `You're receiving this because you subscribed to our updates and offers.`,
    `Unsubscribe: ${unsubUrl}`,
  ].join("\n");

  return send({
    to: args.to,
    subject: args.subject,
    html,
    text,
  });
}
