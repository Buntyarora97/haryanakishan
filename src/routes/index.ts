import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import marketsRouter from "./markets.js";
import betsRouter from "./bets.js";
import walletRouter from "./wallet.js";
import resultsRouter from "./results.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/markets", marketsRouter);
router.use("/bets", betsRouter);
router.use("/wallet", walletRouter);
router.use("/results", resultsRouter);
router.use("/admin", adminRouter);

export default router;
