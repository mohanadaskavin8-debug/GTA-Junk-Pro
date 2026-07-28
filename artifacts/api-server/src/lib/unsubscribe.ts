import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unsubscribe links are signed with an HMAC so nobody can unsubscribe someone
 * else by guessing their email. The token is stable per email address.
 */

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    // Fail loudly rather than signing tokens with a guessable fallback key.
    throw new Error("SESSION_SECRET is not set; cannot sign or verify unsubscribe tokens");
  }
  return value;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", secret()).update(normalizeEmail(email)).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(email), "utf8");
  const provided = Buffer.from(token, "utf8");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

/** Public site origin, used to build links inside emails. */
export function publicBaseUrl(): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  return domain ? `https://${domain}` : "http://localhost:80";
}

export function unsubscribeUrl(email: string): string {
  const normalized = normalizeEmail(email);
  return `${publicBaseUrl()}/unsubscribe?email=${encodeURIComponent(normalized)}&token=${unsubscribeToken(normalized)}`;
}
