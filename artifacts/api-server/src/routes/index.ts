import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import servicesRouter from "./services";
import bookingsRouter from "./bookings";
import subscribersRouter from "./subscribers";
import emailsRouter from "./emails";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(servicesRouter);
router.use(bookingsRouter);
router.use(subscribersRouter);
router.use(emailsRouter);
router.use(dashboardRouter);
router.use(settingsRouter);

export default router;
