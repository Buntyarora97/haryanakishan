import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, hashPassword, authMiddleware } from "../lib/auth.js";

const router = Router();

function generateReferralCode(): string {
  return "HKSH" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, referralCode: usedReferralCode } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: "Name, phone, and password required" });
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Phone already registered" });
    }

    let referralBonus = "0";
    let referrerId: number | null = null;

    if (usedReferralCode) {
      const referrer = await db.select().from(usersTable).where(eq(usersTable.referralCode, usedReferralCode)).limit(1);
      if (referrer.length > 0) {
        referrerId = referrer[0].id;
      }
    }

    const newCode = generateReferralCode();
    const hashed = hashPassword(password);

    const [user] = await db.insert(usersTable).values({
      name,
      phone,
      password: hashed,
      referralCode: newCode,
      referredBy: usedReferralCode || null,
      walletBalance: "0",
    }).returning();

    if (referrerId) {
      const bonus = "50";
      await db.update(usersTable).set({
        walletBalance: db.$with("w").as(
          db.select().from(usersTable).where(eq(usersTable.id, referrerId))
        ) as any,
      });
      await db.execute(
        `UPDATE users SET wallet_balance = wallet_balance + 50 WHERE id = ${referrerId}`
      );
      await db.insert(transactionsTable).values({
        userId: referrerId,
        type: "referral_bonus",
        amount: bonus,
        status: "completed",
        description: `Referral bonus for inviting ${name}`,
      });
    }

    const token = signToken({ userId: user.id, phone: user.phone });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        upiId: user.upiId,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: "Phone and password required" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid phone or password" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Account blocked. Contact support." });
    }
    const hashed = hashPassword(password);
    if (user.password !== hashed) {
      return res.status(400).json({ success: false, message: "Invalid phone or password" });
    }
    const token = signToken({ userId: user.id, phone: user.phone });
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        upiId: user.upiId,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      upiId: user.upiId,
      walletBalance: user.walletBalance,
      referralCode: user.referralCode,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error fetching user" });
  }
});

router.get("/referral/info", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const referrals = await db.select().from(usersTable).where(eq(usersTable.referredBy, user.referralCode));
    const earnings = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, userId));
    const referralEarnings = earnings.filter(t => t.type === "referral_bonus");
    const totalEarnings = referralEarnings.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return res.json({
      referralCode: user.referralCode,
      totalReferrals: referrals.length,
      totalEarnings: totalEarnings.toFixed(2),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error fetching referral info" });
  }
});

export default router;
