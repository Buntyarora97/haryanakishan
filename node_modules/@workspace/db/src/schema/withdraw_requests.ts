import { pgTable, text, serial, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const withdrawRequestsTable = pgTable("withdraw_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  upiId: text("upi_id").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'paid' | 'rejected'
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWithdrawRequestSchema = createInsertSchema(withdrawRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWithdrawRequest = z.infer<typeof insertWithdrawRequestSchema>;
export type WithdrawRequest = typeof withdrawRequestsTable.$inferSelect;
