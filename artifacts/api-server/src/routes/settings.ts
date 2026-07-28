import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

export const SETTINGS_DEFAULTS: Record<string, string> = {
  emailFromAddress: "Piece of Cake Junk <onboarding@resend.dev>",
  businessPhone: "437-775-9626",
  businessEmail: "info@pieceofcakejunk.com",
  serviceArea: "Greater Toronto Area",
};

const BUSINESS_KEYS = [
  "emailFromAddress",
  "businessPhone",
  "businessEmail",
  "serviceArea",
] as const;

/** Keys safe to expose to the public site (no email-sending config). */
const PUBLIC_KEYS = ["businessPhone", "businessEmail", "serviceArea"] as const;

export async function loadBusinessSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = { ...SETTINGS_DEFAULTS };
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return Object.fromEntries(BUSINESS_KEYS.map((key) => [key, map[key]]));
}

async function upsertSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}

router.get("/settings/public", async (_req, res): Promise<void> => {
  const all = await loadBusinessSettings();
  res.json(Object.fromEntries(PUBLIC_KEYS.map((key) => [key, all[key]])));
});

router.get("/settings", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await loadBusinessSettings());
});

router.put("/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  for (const key of BUSINESS_KEYS) {
    const value = parsed.data[key];
    if (value !== undefined) {
      await upsertSetting(key, value);
    }
  }

  res.json(await loadBusinessSettings());
});

export default router;
