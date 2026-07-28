import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, emailCampaignsTable, subscribersTable } from "@workspace/db";
import { SendEmailCampaignBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/requireAdmin";
import { sendCampaignEmail } from "../lib/email";

const router: IRouter = Router();

// Resend allows ~2 requests per second; stay comfortably under it.
const RATE_LIMIT_DELAY_MS = 550;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.get("/emails", requireAdmin, async (_req, res): Promise<void> => {
  const campaigns = await db
    .select()
    .from(emailCampaignsTable)
    .orderBy(desc(emailCampaignsTable.sentAt));
  res.json(campaigns);
});

router.post("/emails/send", requireAdmin, async (req, res): Promise<void> => {
  const parsed = SendEmailCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const subscribers = await db
    .select()
    .from(subscribersTable)
    .orderBy(subscribersTable.createdAt);

  if (subscribers.length === 0) {
    res.status(400).json({ error: "There are no subscribers to send to" });
    return;
  }

  const { subject, body } = parsed.data;

  let sentCount = 0;
  let failedCount = 0;
  let failureReason: string | null = null;

  // Send one at a time so a single bad address never sinks the whole
  // campaign, and per-recipient failures are individually visible.
  for (let i = 0; i < subscribers.length; i++) {
    const subscriber = subscribers[i];
    const result = await sendCampaignEmail({ to: subscriber.email, subject, body });
    if (result.sent) {
      sentCount += 1;
    } else {
      failedCount += 1;
      failureReason ??= result.reason;
      req.log.warn(
        { to: subscriber.email, reason: result.reason },
        "Campaign email NOT sent"
      );
    }
    if (i < subscribers.length - 1) {
      await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  const [campaign] = await db
    .insert(emailCampaignsTable)
    .values({
      subject,
      body,
      recipientCount: subscribers.length,
      sentCount,
      failedCount,
      failureReason,
    })
    .returning();

  if (failedCount > 0) {
    req.log.error(
      { campaignId: campaign.id, sentCount, failedCount, failureReason },
      "Campaign finished with failures"
    );
  } else {
    req.log.info({ campaignId: campaign.id, sentCount }, "Campaign sent to all subscribers");
  }

  res.status(201).json(campaign);
});

export default router;
