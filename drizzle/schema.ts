import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  country: varchar("country", { length: 64 }),
  phone: varchar("phone", { length: 32 }),
  language: varchar("language", { length: 16 }).default("es"),
  timezone: varchar("timezone", { length: 64 }).default("Europe/Madrid"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Own auth fields (email+password and Google OAuth)
  passwordHash: text("passwordHash"),
  googleId: varchar("googleId", { length: 128 }),
  resetToken: varchar("resetToken", { length: 256 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  // Soft delete: when set, the account is "deleted" but the row is kept for audit/recovery.
  // All auth lookups must filter WHERE deletedAt IS NULL.
  deletedAt: timestamp("deletedAt"),
  // Internal admin-only notes about this user (support context, VIP tags, etc.).
  adminNotes: text("adminNotes"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Subscriptions table — tracks Stripe subscriptions per user.
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  stripeSessionId: varchar("stripeSessionId", { length: 128 }),
  plan: mysqlEnum("plan", ["trial", "monthly", "annual"]).default("trial").notNull(),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing", "incomplete"]).default("incomplete").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  // Reason captured from the user when they cancel — powers churn analysis.
  cancelReason: mysqlEnum("cancelReason", [
    "too_expensive",
    "not_using",
    "missing_feature",
    "bug_or_issue",
    "switched_tool",
    "temporary",
    "other",
  ]),
  cancelFeedback: text("cancelFeedback"),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Documents — user PDF documents stored in S3.
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileSize: int("fileSize").default(0).notNull(),
  folderId: int("folderId"),
  /** Payment status: pending = saved but not yet paid, paid = user has active subscription */
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  // First time this doc was downloaded by the owner. Used to count trial usage
  // — re-downloads of the same doc don't count toward the 2-PDF trial limit.
  firstDownloadedAt: timestamp("firstDownloadedAt"),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Folders — document organization for users.
 */
export const folders = mysqlTable("folders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

/**
 * Team invitations — users can invite team members.
 */
export const teamInvitations = mysqlTable("team_invitations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  inviteeEmail: varchar("inviteeEmail", { length: 320 }).notNull(),
  inviteeId: int("inviteeId"),
  role: mysqlEnum("role", ["editor", "viewer", "admin"]).default("editor").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = typeof teamInvitations.$inferInsert;

/**
 * Legal pages — editable content for Terms, Privacy, Refund, Cookies, etc.
 */
export const legalPages = mysqlTable("legal_pages", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LegalPage = typeof legalPages.$inferSelect;
export type InsertLegalPage = typeof legalPages.$inferInsert;

/**
 * Contact messages — submitted via the contact form.
 */
export const contactMessages = mysqlTable("contact_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  reason: varchar("reason", { length: 128 }),
  subject: varchar("subject", { length: 256 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  repliedAt: timestamp("repliedAt"),
  replyBody: text("replyBody"),
  archivedAt: timestamp("archivedAt"),
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;

/**
 * Site settings — key/value store for admin-configurable settings
 */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;

/**
 * Email templates — admin-managed canned replies for contact_messages.
 * `body` may contain {{name}} / {{subject}} placeholders that are
 * substituted client-side at insert time.
 */
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Blog posts — SEO/GEO-optimized articles for the blog section.
 */
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  metaTitle: varchar("metaTitle", { length: 512 }),
  metaDescription: text("metaDescription"),
  category: varchar("category", { length: 128 }).default("guides").notNull(),
  tags: text("tags"),
  readTime: int("readTime").default(5).notNull(),
  published: boolean("published").default(true).notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Webhook events — persisted log of Stripe (or other) webhook deliveries so
 * the admin can trace whether events arrived and were processed successfully.
 * Capped retention: keep last ~500 rows via periodic pruning (future job).
 */
export const webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 32 }).default("stripe").notNull(),
  eventId: varchar("eventId", { length: 128 }),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["ok", "error"]).notNull(),
  errorMessage: text("errorMessage"),
  durationMs: int("durationMs").default(0).notNull(),
  payload: text("payload"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

/**
 * Audit log — who did what in the admin panel. Keeps an immutable trail for
 * investigating incidents (rogue admins, bad refunds, role escalations).
 */
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  adminEmail: varchar("adminEmail", { length: 320 }),
  action: varchar("action", { length: 64 }).notNull(),
  targetType: varchar("targetType", { length: 64 }),
  targetId: varchar("targetId", { length: 128 }),
  metadata: text("metadata"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
