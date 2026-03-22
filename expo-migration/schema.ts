// shared/schema.ts — Adapted for Supabase unified database
// Drop-in replacement for the Replit version
// The Expo app and the suacasaleblon.com admin now share the same database

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, date, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table — named "app_users" in Supabase to avoid conflict with Supabase auth.users
export const users = pgTable("app_users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("cleaner"),
  avatarUrl: text("avatar_url"),
  pixKey: text("pix_key"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cleanings — unified table with both admin and Expo fields
// Triggers in Supabase keep scheduled_date <-> cleaning_date in sync
export const cleanings = pgTable("cleanings", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  apartmentCode: text("apartment_code").notNull(),
  cleaningDate: date("cleaning_date").notNull(),
  arrivalDate: date("arrival_date"),
  guestCount: integer("guest_count"),
  observations: text("observations"),
  sortOrder: integer("sort_order").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  photos: jsonb("photos").$type<string[]>().default([]),
  cleanerId: text("cleaner_id"),
  cleaningCost: numeric("cleaning_cost"),
  source: text("source").notNull().default("manual"),
  manuallyEdited: boolean("manually_edited").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deletedCleanings = pgTable("deleted_cleanings", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  apartmentCode: text("apartment_code").notNull(),
  cleaningDate: date("cleaning_date").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull(),
  category: text("category").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  apartmentCode: text("apartment_code").notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const checklistItems = pgTable("checklist_items", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  title: text("title").notNull(),
  category: text("category").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(true),
  frequencyDays: integer("frequency_days"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const checklistCompletions = pgTable("checklist_completions", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  checklistItemId: text("checklist_item_id").notNull(),
  apartmentCode: text("apartment_code").notNull(),
  completedBy: text("completed_by").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const maintenanceItems = pgTable("maintenance_items", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  title: text("title").notNull(),
  description: text("description"),
  frequencyDays: integer("frequency_days").notNull(),
  apartmentCode: text("apartment_code"),
  urgency: text("urgency").notNull().default("media"),
  photos: jsonb("photos").$type<string[]>().default([]),
  lastDoneAt: timestamp("last_done_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  name: text("name"),
  createdBy: text("created_by").notNull(),
  participants: jsonb("participants").notNull().$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  chatId: text("chat_id").notNull(),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  apartmentCode: text("apartment_code").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  urgency: text("urgency").notNull().default("normal"),
  status: text("status").notNull().default("open"),
  reportedBy: text("reported_by").notNull(),
  mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loginLogs = pgTable("login_logs", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  loggedInAt: timestamp("logged_in_at").defaultNow(),
});

export const cleanerPayments = pgTable("cleaner_payments", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  cleanerId: text("cleaner_id").notNull(),
  type: text("type").notNull(),
  label: text("label"),
  amount: numeric("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expenseCategories = pgTable("expense_categories", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expenses from the cleaning app — stored in app_expenses
export const expenses = pgTable("app_expenses", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  submittedBy: text("submitted_by").notNull(),
  categoryId: text("category_id").notNull(),
  description: text("description"),
  amount: numeric("amount").notNull(),
  receiptPhotos: jsonb("receipt_photos").$type<string[]>().default([]),
  expenseDate: date("expense_date").notNull(),
  apartmentCode: text("apartment_code"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Insert schemas ───
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  role: true,
});

export const insertCleaningSchema = createInsertSchema(cleanings).pick({
  apartmentCode: true,
  cleaningDate: true,
  arrivalDate: true,
  guestCount: true,
  observations: true,
  sortOrder: true,
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  name: true,
  phone: true,
  role: true,
  category: true,
  notes: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).pick({
  apartmentCode: true,
  itemName: true,
  quantity: true,
  category: true,
});

export const insertChecklistItemSchema = createInsertSchema(checklistItems).pick({
  title: true,
  category: true,
  isRecurring: true,
  frequencyDays: true,
});

export const insertMaintenanceItemSchema = createInsertSchema(maintenanceItems).pick({
  title: true,
  description: true,
  frequencyDays: true,
  apartmentCode: true,
  urgency: true,
  photos: true,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  name: true,
  createdBy: true,
  participants: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  senderId: true,
  content: true,
});

export const insertReportSchema = createInsertSchema(reports).pick({
  apartmentCode: true,
  title: true,
  description: true,
  urgency: true,
  reportedBy: true,
  mediaUrls: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Cleaning = typeof cleanings.$inferSelect;
export type DeletedCleaning = typeof deletedCleanings.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type ChecklistCompletion = typeof checklistCompletions.$inferSelect;
export type MaintenanceItem = typeof maintenanceItems.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type LoginLog = typeof loginLogs.$inferSelect;
export type CleanerPayment = typeof cleanerPayments.$inferSelect;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
