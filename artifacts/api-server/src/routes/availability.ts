import { Router, type IRouter } from "express";
import { UpdateAvailabilityBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/requireAdmin";
import { upsertSetting } from "./settings";
import {
  AVAILABILITY_KEY,
  loadAvailability,
  normalizeAvailability,
  toApiShape,
  validateAvailabilityConfig,
} from "../lib/availability";

const router: IRouter = Router();

// Public: the booking wizard needs days + windows (contains no sensitive data).
router.get("/availability", async (_req, res): Promise<void> => {
  res.json(toApiShape(await loadAvailability()));
});

router.put("/availability", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Semantic checks the OpenAPI schema can't express (time format, order, dupes).
  const error = validateAvailabilityConfig(parsed.data);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const normalized = normalizeAvailability(parsed.data);
  await upsertSetting(AVAILABILITY_KEY, JSON.stringify(normalized));
  res.json(toApiShape(normalized));
});

export default router;
