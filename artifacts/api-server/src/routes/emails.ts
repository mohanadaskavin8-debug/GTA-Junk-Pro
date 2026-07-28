import { Router, type IRouter } from "express";
import { db, emailCampaignsTable, subscribersTable } from "@workspace/db";
import { SendEmailCampaignBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/emails", async (_req, res): Promise<void> => {
  const campaigns = await db
    .select()
    .from(emailCampaignsTable)
    .orderBy(emailCampaignsTable.sentAt);
  res.json(campaigns);
});

router.post("/emails/send", async (req, res): Promise<void> => {
  const parsed = SendEmailCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Count subscribers
  const subscribers = await db.select().from(subscribersTable);
  const recipientCount = subscribers.length;

  // In a real app, you'd send the emails here.
  // For now, we log the campaign and record it.
  req.log.info(
    { subject: parsed.data.subject, recipientCount },
    "Email campaign sent (simulated)"
  );

  const [campaign] = await db
    .insert(emailCampaignsTable)
    .values({
      subject: parsed.data.subject,
      body: parsed.data.body,
      recipientCount,
    })
    .returning();

  res.status(201).json(campaign);
});

export default router;
