import { Router } from "express";
import { db } from "@workspace/db";
import { betsTable, marketsTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { marketId, gameType, number, amount } = req.body;

    if (!marketId || !gameType || !number || !amount) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    if (!["jodi", "single"].includes(gameType)) {
      return res.status(400).json({ success: false, message: "Invalid game type" });
    }

    if (amount < 10) {
      return res.status(400).json({ success: false, message: "Minimum bet is ₹10" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.isBlocked) return res.status(403).json({ success: false, message: "Account blocked" });

    const balance = parseFloat(user.walletBalance);
    if (balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }

    const [market] = await db.select().from(marketsTable).where(eq(marketsTable.id, marketId)).limit(1);
    if (!market) return res.status(404).json({ success: false, message: "Market not found" });
    if (!market.isActive) return res.status(400).json({ success: false, message: "Market is closed" });

    if (gameType === "jodi") {
      const num = parseInt(number);
      if (isNaN(num) || num < 0 || num > 99) {
        return res.status(400).json({ success: false, message: "Jodi number must be 00-99" });
      }
    } else {
      const num = parseInt(number);
      if (isNaN(num) || num < 0 || num > 9) {
        return res.status(400).json({ success: false, message: "Single digit must be 0-9" });
      }
    }

    const newBalance = balance - amount;
    await db.update(usersTable).set({ walletBalance: newBalance.toFixed(2) }).where(eq(usersTable.id, userId));

    const [bet] = await db.insert(betsTable).values({
      userId,
      marketId,
      marketName: market.name,
      gameType,
      number: gameType === "jodi" ? number.toString().padStart(2, "0") : number.toString(),
      amount: amount.toFixed(2),
      status: "pending",
    }).returning();

    await db.insert(transactionsTable).values({
      userId,
      type: "bet",
      amount: amount.toFixed(2),
      status: "completed",
      description: `Bet on ${market.name} - ${gameType} ${number}`,
      referenceId: bet.id.toString(),
    });

    return res.json({
      success: true,
      bet: {
        id: bet.id,
        marketName: bet.marketName,
        gameType: bet.gameType,
        number: bet.number,
        amount: bet.amount,
        winAmount: bet.winAmount,
        status: bet.status,
        createdAt: bet.createdAt.toISOString(),
      },
      newBalance: newBalance.toFixed(2),
    });
  } catch (err) {
    console.error("Bet error:", err);
    return res.status(500).json({ success: false, message: "Error placing bet" });
  }
});

router.get("/my", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const bets = await db.select().from(betsTable)
      .where(eq(betsTable.userId, userId))
      .orderBy(desc(betsTable.createdAt))
      .limit(100);
    return res.json({
      bets: bets.map(b => ({
        id: b.id,
        marketName: b.marketName,
        gameType: b.gameType,
        number: b.number,
        amount: b.amount,
        winAmount: b.winAmount,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error fetching bets" });
  }
});

export default router;
