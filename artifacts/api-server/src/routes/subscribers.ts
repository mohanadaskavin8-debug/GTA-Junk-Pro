import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subscribersTable } from "@workspace/db";
import {
  CreateSubscriberBody,
  DeleteSubscriberParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/subscribers", async (_req, res): Promise<void> => {
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

  const existing = await db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.email, parsed.data.email));

  if (existing.length > 0) {
    res.status(409).json({ error: "Already subscribed" });
    return;
  }

  const [subscriber] = await db
    .insert(subscribersTable)
    .values({
      email: parsed.data.email,
      name: parsed.data.name ?? null,
    })
    .returning();

  res.status(201).json(subscriber);
});

router.delete("/subscribers/:id", async (req, res): Promise<void> => {
  const params = DeleteSubscriberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [subscriber] = await db
    .delete(subscribersTable)
    .where(eq(subscribersTable.id, params.data.id))
    .returning();

  if (!subscriber) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
