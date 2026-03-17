import { Router } from "express";
import { db } from "@workspace/db";
import { marketsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const markets = await db.select().from(marketsTable).where(eq(marketsTable.isActive, true));
    return res.json({
      markets: markets.map(m => ({
        id: m.id,
        name: m.name,
        resultTime: m.resultTime,
        isActive: m.isActive,
        latestResult: m.latestResult,
        isLive: m.isLive,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error fetching markets" });
  }
});

export default router;
