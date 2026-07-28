import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db, settingsTable, bookingsTable } from "@workspace/db";

type BookingRow = typeof bookingsTable.$inferSelect;

export type EmailResult = { sent: true } | { sent: false; reason: string };

const DEFAULT_FROM = "Piece of Cake Junk <onboarding@resend.dev>";

const BRAND_PURPLE = "#7c3aed";
const BRAND_PURPLE_DARK = "#5b21b6";
const BRAND_YELLOW = "#facc15";

async function getFromAddress(): Promise<string> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "emailFromAddress"));
  return row?.value?.trim() || DEFAULT_FROM;
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

export async function sendBookingConfirmation(booking: BookingRow): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured" };
  }

  const resend = new Resend(apiKey);
  const from = await getFromAddress();

  const ref = `POC-${booking.id.toString().padStart(4, "0")}`;
  const dateLabel = formatEstimateDate(booking.serviceDate);
  const load = loadSizeLabel(booking.loadSize);
  const name = escapeHtml(booking.customerName);
  const firstName = escapeHtml(booking.customerName.split(" ")[0] || booking.customerName);
  const fullAddress = escapeHtml(
    [booking.address, booking.city, booking.postalCode].filter(Boolean).join(", ")
  );

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee9fb;color:#6b7280;font-size:14px;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee9fb;color:#111827;font-size:14px;font-weight:700;text-align:right;">${value}</td>
    </tr>`;

  const html = `
  <div style="background:#f4f1fa;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <div style="background:${BRAND_PURPLE};background:linear-gradient(135deg,${BRAND_PURPLE},${BRAND_PURPLE_DARK});padding:32px 32px 28px;">
        <div style="display:inline-block;background:${BRAND_YELLOW};color:#3b2b00;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:999px;padding:6px 14px;margin-bottom:16px;">Free Estimate Booked</div>
        <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.25;">You're all set, ${firstName}!</h1>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:15px;line-height:1.5;">
          Your no-obligation in-person estimate is confirmed. We always come ready to provide same-day removal if you'd like us to proceed.
        </p>
      </div>
      <div style="padding:28px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${detailRow("Reference", ref)}
          ${detailRow("Estimate Date", escapeHtml(dateLabel))}
          ${detailRow("Arrival Window", escapeHtml(booking.serviceTime))}
          ${detailRow("Estimated Load", escapeHtml(load))}
          ${detailRow("Pickup Address", fullAddress)}
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
          Need to make a change? Just reply to this email or call us at <strong style="color:#111827;">437-775-9626</strong>.
        </p>
      </div>
      <div style="background:#faf9fd;border-top:1px solid #eee9fb;padding:18px 32px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Piece of Cake Junk Removal &bull; Greater Toronto Area</p>
      </div>
    </div>
  </div>`;

  const text = [
    `You're all set, ${booking.customerName}!`,
    ``,
    `Your no-obligation in-person estimate is confirmed. We always come ready to provide same-day removal if you'd like us to proceed.`,
    ``,
    `Reference: ${ref}`,
    `Estimate Date: ${dateLabel}`,
    `Arrival Window: ${booking.serviceTime}`,
    `Estimated Load: ${load}`,
    `Pickup Address: ${[booking.address, booking.city, booking.postalCode].filter(Boolean).join(", ")}`,
    booking.isBusiness && booking.businessName ? `Business: ${booking.businessName}` : "",
    ``,
    `What happens next? Our team arrives during your window, takes a quick look, and gives you an exact, all-inclusive price on the spot. No pressure, no obligation - and if you like the price, we can haul everything away right then and there.`,
    ``,
    `Need to make a change? Reply to this email or call 437-775-9626.`,
    `Piece of Cake Junk Removal - Greater Toronto Area`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  try {
    const { error } = await resend.emails.send({
      from,
      to: booking.customerEmail,
      subject: `Your Free Estimate is Booked - ${ref} | Piece of Cake Junk`,
      html,
      text,
    });
    if (error) {
      return { sent: false, reason: error.message ?? JSON.stringify(error) };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
