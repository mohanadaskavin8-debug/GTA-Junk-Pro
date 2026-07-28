import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, subscribersTable } from "@workspace/db";
import {
  CreateSubscriberBody,
  DeleteSubscriberParams,
  UnsubscribeBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/requireAdmin";
import { normalizeEmail, verifyUnsubscribeToken } from "../lib/unsubscribe";

const router: IRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/subscribers", requireAdmin, async (_req, res): Promise<void> => {
  const subscribers = await db
    .select()
    .from(subscribersTable)
    .orderBy(subscribersTable.createdAt);
  res.json(subscribers);
});

router.post("/subscribers", async (req, res): Promise<void> => {
  const parsed = CreateSubscriberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // SubscriberInput intentionally leaves email as a plain string (orval emits
  // broken Zod-v4 syntax for `format: email`), so validate the format here.
  const email = normalizeEmail(parsed.data.email);
  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "email must be a valid email address" });
    return;
  }

  const existing = await db
    .select()
    .from(subscribersTable)
    .where(sql`lower(${subscribersTable.email}) = ${email}`);

  if (existing.length > 0) {
    res.status(409).json({ error: "Already subscribed" });
    return;
  }

  const [subscriber] = await db
    .insert(subscribersTable)
    .values({
      email,
      name: parsed.data.name ?? null,
    })
    .returning();

  res.status(201).json(subscriber);
});

// Public endpoint hit from the signed link in every promotional email.
router.post("/subscribers/unsubscribe", async (req, res): Promise<void> => {
  const parsed = UnsubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, token } = parsed.data;
  if (!verifyUnsubscribeToken(email, token)) {
    res.status(400).json({
      error: "This unsubscribe link is invalid. Reply to any of our emails and we'll remove you right away.",
    });
    return;
  }

  const removed = await db
    .delete(subscribersTable)
    .where(sql`lower(${subscribersTable.email}) = ${normalizeEmail(email)}`)
    .returning();

  if (removed.length > 0) {
    req.log.info({ email: normalizeEmail(email) }, "Subscriber unsubscribed");
  }

  // Idempotent: an already-removed address still reports success.
  res.json({ success: true });
});

router.delete("/subscribers/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteSubscriberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [subscriber] = await db
    .delete(subscribersTable)
    .where(sql`${subscribersTable.id} = ${params.data.id}`)
    .returning();

  if (!subscriber) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
