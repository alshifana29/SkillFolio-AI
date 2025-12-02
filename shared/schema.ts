import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("student"),
  isActive: boolean("is_active").notNull().default(true),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const certificates = pgTable("certificates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  title: text("title").notNull(),
  institution: text("institution").notNull(),
  certificateType: text("certificate_type").notNull().default("course"),
  description: text("description"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  internshipDuration: text("internship_duration"),
  status: text("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id),
  reviewNotes: text("review_notes"),
  aiAnalysis: text("ai_analysis"),
  fraudScore: integer("fraud_score"),
  blockchainHash: text("blockchain_hash"),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blockchainBlocks = pgTable("blockchain_blocks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  index: integer("index").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  data: jsonb("data").notNull(),
  previousHash: text("previous_hash").notNull(),
  hash: text("hash").notNull(),
  nonce: integer("nonce").notNull().default(0),
  difficulty: integer("difficulty").notNull().default(2),
  certificateId: varchar("certificate_id", { length: 36 }).references(() => certificates.id),
});

export const forgeryReports = pgTable("forgery_reports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  certificateId: varchar("certificate_id", { length: 36 }).notNull().references(() => certificates.id),
  authenticity: text("authenticity").notNull(),
  fraudScore: integer("fraud_score").notNull(),
  elaScore: integer("ela_score"),
  noiseScore: integer("noise_score"),
  templateScore: integer("template_score"),
  tamperZones: jsonb("tamper_zones"),
  reasoning: text("reasoning"),
  extractedText: text("extracted_text"),
  qrData: text("qr_data"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const portfolioViews = pgTable("portfolio_views", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  viewerIp: text("viewer_ip"),
  viewerUserAgent: text("viewer_user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: varchar("resource_id", { length: 36 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  githubLink: text("github_link").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  userId: true,
  status: true,
  reviewedBy: true,
  reviewNotes: true,
  aiAnalysis: true,
  fraudScore: true,
  blockchainHash: true,
  qrCode: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  institution: z.string().min(1, "Institution is required"),
  certificateType: z.enum(["course", "hackathon", "internship", "workshop"], {
    errorMap: () => ({ message: "Invalid certificate type" }),
  }).default("course"),
  internshipDuration: z.string().optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  githubLink: z.string().url("Must be a valid URL").min(1, "GitHub link is required"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;

export type BlockchainBlock = typeof blockchainBlocks.$inferSelect;
export type ForgeryReport = typeof forgeryReports.$inferSelect;
export type PortfolioView = typeof portfolioViews.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
