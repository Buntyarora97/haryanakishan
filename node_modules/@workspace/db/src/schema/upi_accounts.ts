import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const upiAccountsTable = pgTable("upi_accounts", {
  id: serial("id").primaryKey(),
  upiId: text("upi_id").notNull(),
  holderName: text("holder_name"),
  isActive: boolean("is_active").notNull().default(true),
  rotationOrder: integer("rotation_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUpiAccountSchema = createInsertSchema(upiAccountsTable).omit({ id: true, createdAt: true });
export type InsertUpiAccount = z.infer<typeof insertUpiAccountSchema>;
export type UpiAccount = typeof upiAccountsTable.$inferSelect;
