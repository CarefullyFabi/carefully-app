import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text().primaryKey(),
  messageCount: integer("message_count").notNull().default(0),
  isPremium: boolean("is_premium").notNull().default(false),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
