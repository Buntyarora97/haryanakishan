import { Router } from "express";
import { db } from "@workspace/db";
import { resultsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/latest", async (_req, res) => {
  try {
    const results = await db.select().from(resultsTable).orderBy(desc(resultsTable.createdAt)).limit(50);
    return res.json({
      results: results.map(r => ({
        id: r.id,
        marketId: r.marketId,
        marketName: r.marketName,
        resultNumber: r.resultNumber,
        gameDate: r.gameDate,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error fetching results" });
  }
});

export default router;
