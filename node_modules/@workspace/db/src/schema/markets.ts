import { pgTable, text, serial, boolean, time, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketsTable = pgTable("markets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  resultTime: text("result_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  latestResult: text("latest_result"),
  isLive: boolean("is_live").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMarketSchema = createInsertSchema(marketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof marketsTable.$inferSelect;
