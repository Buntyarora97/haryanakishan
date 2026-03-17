import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable, upiAccountsTable, depositRequestsTable, withdrawRequestsTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ balance: user.walletBalance });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error" });
  }
});

router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const txns = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, userId))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(100);
    return res.json({
      transactions: txns.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error" });
  }
});

router.get("/active-upi", authMiddleware, async (req, res) => {
  try {
    const active = await db.select().from(upiAccountsTable)
      .where(eq(upiAccountsTable.isActive, true))
      .orderBy(asc(upiAccountsTable.rotationOrder))
      .limit(1);
    if (active.length === 0) {
      return res.status(404).json({ success: false, message: "No UPI available" });
    }
    return res.json({
      upiId: active[0].upiId,
      holderName: active[0].holderName,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error" });
  }
});

router.post("/deposit", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { amount, upiId, screenshotUrl } = req.body;
    if (!amount || !upiId) {
      return res.status(400).json({ success: false, message: "Amount and UPI ID required" });
    }
    if (amount < 100) {
      return res.status(400).json({ success: false, message: "Minimum deposit is ₹100" });
    }
    await db.insert(depositRequestsTable).values({
      userId,
      amount: amount.toFixed(2),
      upiId,
      screenshotUrl: screenshotUrl || null,
      status: "pending",
    });
    return res.json({ success: true, message: "Deposit request submitted. Awaiting approval." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error submitting deposit" });
  }
});

router.post("/withdraw", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { amount, upiId } = req.body;
    if (!amount || !upiId) {
      return res.status(400).json({ success: false, message: "Amount and UPI ID required" });
    }
    if (amount < 500) {
      return res.status(400).json({ success: false, message: "Minimum withdrawal is ₹500" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const balance = parseFloat(user.walletBalance);
    if (balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }
    const newBalance = balance - amount;
    await db.update(usersTable).set({ walletBalance: newBalance.toFixed(2) }).where(eq(usersTable.id, userId));
    await db.insert(withdrawRequestsTable).values({
      userId,
      amount: amount.toFixed(2),
      upiId,
      status: "pending",
    });
    await db.insert(transactionsTable).values({
      userId,
      type: "withdraw",
      amount: amount.toFixed(2),
      status: "pending",
      description: `Withdrawal to ${upiId}`,
    });
    return res.json({ success: true, message: "Withdrawal request submitted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error submitting withdrawal" });
  }
});

export default router;
