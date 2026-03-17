import { pgTable, text, serial, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const betsTable = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  marketId: integer("market_id").notNull(),
  marketName: text("market_name").notNull(),
  gameType: text("game_type").notNull(), // 'jodi' | 'single'
  number: text("number").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  winAmount: decimal("win_amount", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("pending"), // 'pending' | 'win' | 'loss'
  resultNumber: text("result_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBetSchema = createInsertSchema(betsTable).omit({ id: true, createdAt: true });
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof betsTable.$inferSelect;
