import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { AdminLoginBody, ChangeAdminPasswordBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/requireAdmin";

declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
  }
}

const router: IRouter = Router();

const ADMIN_PASSWORD_KEY = "adminPassword";

async function getAdminPassword(): Promise<string> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, ADMIN_PASSWORD_KEY));
  return row?.value ?? process.env.ADMIN_PASSWORD ?? "admin123";
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const adminPassword = await getAdminPassword();
  if (parsed.data.password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  req.session.isAdmin = true;
  res.json({ isAdmin: true });
});

router.post("/auth/change-password", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ChangeAdminPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const currentPassword = await getAdminPassword();
  if (parsed.data.currentPassword !== currentPassword) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  await db
    .insert(settingsTable)
    .values({
      key: ADMIN_PASSWORD_KEY,
      value: parsed.data.newPassword,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: parsed.data.newPassword, updatedAt: new Date() },
    });

  res.json({ isAdmin: true });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json({ isAdmin: false });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const isAdmin = req.session.isAdmin === true;
  res.json({ isAdmin });
});

export default router;
