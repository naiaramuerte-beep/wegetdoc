import { and, desc, eq, isNull, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertBlogPost,
  auditLog,
  blogPosts,
  contactMessages,
  documents,
  emailTemplates,
  folders,
  legalPages,
  siteSettings,
  subscriptions,
  teamInvitations,
  users,
  webhookEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;

    for (const field of textFields) {
      const value = user[field];
      if (value === undefined) continue;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (
      user.openId === ENV.ownerOpenId ||
      (user.email && ["naiaramuerte@gmail.com", "morteapps@outlook.com", "sergisd39@gmail.com"].includes(user.email))
    ) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  // Exclude soft-deleted users from all auth lookups
  const result = await db.select().from(users).where(and(eq(users.openId, openId), isNull(users.deletedAt))).limit(1);
  return result[0] ?? undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1);
  return result[0] ?? undefined;
}

export async function getAllUsers(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const cols = {
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    loginMethod: users.loginMethod,
    role: users.role,
    country: users.country,
    language: users.language,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    lastSignedIn: users.lastSignedIn,
    adminNotes: users.adminNotes,
    // Subscription info
    subStatus: subscriptions.status,
    subPlan: subscriptions.plan,
    stripeCustomerId: subscriptions.stripeCustomerId,
    currentPeriodEnd: subscriptions.currentPeriodEnd,
    cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
  };
  if (search) {
    return db
      .select(cols)
      .from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(like(users.email, `%${search}%`))
      .orderBy(desc(users.createdAt));
  }
  return db.select(cols).from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).orderBy(desc(users.createdAt));
}

// ─── Subscriptions ────────────────────────────────────────────
export async function getActiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  const sub = result[0];
  if (!sub) return null;
  const activeStatuses = ["active", "trialing"];
  if (!activeStatuses.includes(sub.status)) return null;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return null;
  return sub;
}

export async function userHasActiveSubscription(userId: number): Promise<boolean> {
  const sub = await getActiveSubscription(userId);
  return sub !== null;
}

export async function upsertSubscription(data: {
  userId: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
  plan?: "trial" | "monthly" | "annual";
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, data.userId))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  if (existing[0]) {
    await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.id, existing[0].id));
  } else {
    await db.insert(subscriptions).values(data);
  }
}

export async function getSubscriptionByStripeSubId(stripeSubscriptionId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)).limit(1);
  return result[0] ?? null;
}

export async function cancelSubscriptionDb(userId: number) {
  const db = await getDb();
  if (!db) return;
  // Find the active subscription to cancel in Stripe if applicable
  const sub = await getActiveSubscription(userId);
  if (sub?.stripeSubscriptionId) {
    try {
      const { getStripe } = await import("./_core/stripe");
      await getStripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    } catch (err) {
      console.error("[Stripe] Failed to cancel subscription:", err);
    }
  }
  await db.update(subscriptions).set({ status: "canceled", cancelAtPeriodEnd: true })
    .where(eq(subscriptions.userId, userId));
}

export async function getAllSubscribedUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    country: users.country,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    subStatus: subscriptions.status,
    plan: subscriptions.plan,
    currentPeriodEnd: subscriptions.currentPeriodEnd,
    stripeCustomerId: subscriptions.stripeCustomerId,
  }).from(users)
    .innerJoin(subscriptions, eq(users.id, subscriptions.userId))
    .orderBy(desc(users.createdAt));
}

export async function deactivateUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role: "user" }).where(eq(users.id, userId));
}

// Soft delete: mark the user as deleted but keep the row for audit/recovery.
// All auth-related lookups filter WHERE deletedAt IS NULL, so this user will be
// unable to sign in, be found by email/Google/openId, and won't appear in admin lists.
export async function deleteUserById(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserProfile(
  userId: number,
  data: { name?: string; email?: string; phone?: string; language?: string; timezone?: string; country?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}


// ─── Documents ────────────────────────────────────────────────
export async function getDocumentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.updatedAt));
}

export async function createDocument(data: {
  userId: number;
  name: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  folderId?: number;
  paymentStatus?: "pending" | "paid";
}) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(documents).values(data);
  const result = await db.select().from(documents)
    .where(and(eq(documents.userId, data.userId), eq(documents.fileKey, data.fileKey))).limit(1);
  return result[0] ?? null;
}

/** Mark all pending documents for a user as paid (called after subscription activation) */
export async function markDocumentsPaid(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(documents).set({ paymentStatus: "paid" }).where(
    and(eq(documents.userId, userId), eq(documents.paymentStatus, "pending"))
  );
}

export async function updateDocument(docId: number, userId: number, data: { name?: string; fileKey?: string; fileUrl?: string; fileSize?: number; paymentStatus?: "pending" | "paid" }) {
  const db = await getDb();
  if (!db) return;
  await db.update(documents).set(data).where(and(eq(documents.id, docId), eq(documents.userId, userId)));
}

export async function deleteDocument(docId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(documents).where(and(eq(documents.id, docId), eq(documents.userId, userId)));
}

export async function getDocumentById(docId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, userId))).limit(1);
  return result[0] ?? null;
}

// ─── Folders ──────────────────────────────────────────────────
export async function getFoldersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(folders).where(eq(folders.userId, userId)).orderBy(folders.name);
}

export async function createFolder(userId: number, name: string) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(folders).values({ userId, name });
  const result = await db.select().from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.name, name))).limit(1);
  return result[0] ?? null;
}

export async function deleteFolder(folderId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(folders).where(and(eq(folders.id, folderId), eq(folders.userId, userId)));
}

// ─── Team Invitations ─────────────────────────────────────────
export async function getTeamInvitations(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamInvitations)
    .where(eq(teamInvitations.ownerId, ownerId))
    .orderBy(desc(teamInvitations.createdAt));
}

export async function createTeamInvitation(data: {
  ownerId: number;
  inviteeEmail: string;
  role: "editor" | "viewer" | "admin";
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(teamInvitations).values({ ...data, status: "pending" });
}

export async function removeTeamInvitation(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(teamInvitations).where(and(eq(teamInvitations.id, id), eq(teamInvitations.ownerId, ownerId)));
}

// ─── Legal Pages ──────────────────────────────────────────────
export async function getLegalPage(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(legalPages)
    .where(eq(legalPages.slug, slug))
    .limit(1);
  return result[0] ?? null;
}

export async function getAllLegalPages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legalPages).orderBy(legalPages.slug);
}

export async function upsertLegalPage(slug: string, title: string, content: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await getLegalPage(slug);
  if (existing) {
    await db
      .update(legalPages)
      .set({ title, content, updatedAt: new Date() })
      .where(eq(legalPages.slug, slug));
  } else {
    await db.insert(legalPages).values({ slug, title, content });
  }
}

// ─── Site Settings ────────────────────────────────────────────
export async function getSiteSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return result[0]?.value ?? null;
}

export async function setSiteSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

export async function getAllSiteSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(siteSettings);
}

/**
 * Read the active monthly subscription price from `site_settings`. Used by
 * email templates, MRR calc, and anything else that needs the current price
 * server-side. Returns numeric eur + a comma-formatted display string, both
 * with a sane fallback so callers never have to handle nulls.
 */
export async function getActiveMonthlyPrice(): Promise<{ eur: number; formatted: string }> {
  const raw = await getSiteSetting("subscription_price_eur");
  const n = Number((raw ?? "").replace(",", "."));
  const eur = Number.isFinite(n) && n > 0 ? n : 19.99;
  const formatted = `${eur.toFixed(2).replace(".", ",")}€`;
  return { eur, formatted };
}

// ─── Contact Messages ─────────────────────────────────────────
export async function createContactMessage(data: {
  userId?: number;
  name: string;
  email: string;
  reason: string;
  subject: string;
  message: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactMessages).values(data);
}

export async function getAllContactMessages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
}

export async function markContactMessageRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contactMessages).set({ read: true }).where(eq(contactMessages.id, id));
}

export async function getContactMessageById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1);
  return row ?? null;
}

export async function markContactMessageReplied(id: number, replyBody: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(contactMessages)
    .set({ repliedAt: new Date(), replyBody, read: true })
    .where(eq(contactMessages.id, id));
}

// ─── Email Templates (canned admin replies) ──────────────────────
export async function getEmailTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailTemplates).orderBy(desc(emailTemplates.updatedAt));
}

export async function createEmailTemplate(data: { name: string; body: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(emailTemplates).values(data);
}

export async function updateEmailTemplate(id: number, data: { name: string; body: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailTemplates).set(data).where(eq(emailTemplates.id, id));
}

export async function deleteEmailTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
}

// ─── Admin stats ──────────────────────────────────────────────
export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, activeSubscriptions: 0, totalDocuments: 0, unreadMessages: 0 };
  const [totalUsersRes, activeSubsRes, totalDocsRes, unreadMsgRes] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active")),
    db.select({ count: sql<number>`count(*)` }).from(documents),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contactMessages)
      .where(eq(contactMessages.read, false)),
  ]);
  return {
    totalUsers: Number(totalUsersRes[0]?.count ?? 0),
    activeSubscriptions: Number(activeSubsRes[0]?.count ?? 0),
    totalDocuments: Number(totalDocsRes[0]?.count ?? 0),
    unreadMessages: Number(unreadMsgRes[0]?.count ?? 0),
  };
}

// ─── Own Auth helpers ─────────────────────────────────────────
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(and(eq(users.email, email), isNull(users.deletedAt))).limit(1);
  return result[0] ?? undefined;
}

export async function getUserByGoogleId(googleId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(and(eq(users.googleId, googleId), isNull(users.deletedAt))).limit(1);
  return result[0] ?? undefined;
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(and(eq(users.resetToken, token), isNull(users.deletedAt))).limit(1);
  return result[0] ?? undefined;
}

export async function createOwnUser(data: {
  email: string;
  name?: string;
  passwordHash?: string;
  googleId?: string;
  loginMethod: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) return null;
  // Generate a unique openId for own-auth users
  const openId = `own_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name ?? null,
    passwordHash: data.passwordHash ?? null,
    googleId: data.googleId ?? null,
    loginMethod: data.loginMethod,
    role: data.role ?? "user",
    emailVerified: !!data.googleId,
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function setResetToken(userId: number, token: string, expiry: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(users.id, userId));
}

export async function clearResetToken(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ resetToken: null, resetTokenExpiry: null }).where(eq(users.id, userId));
}

export async function setGoogleId(userId: number, googleId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ googleId, emailVerified: true, loginMethod: "google" }).where(eq(users.id, userId));
}

// ─── MRR & Billing Stats ──────────────────────────────────────
// MRR pricing constants. Monthly is read from site_settings on each
// stats query so an admin price change reflects in MRR projections.
// Caveat: existing subs may have been created at a different price; we
// can't tell from the local row what they actually pay (Stripe knows but
// we'd need to fetch per sub). The numbers below are best-effort
// projections based on the *current* price.
const ANNUAL_PRICE_EUR = 99;
const INTRO_PRICE_EUR = 0.50;

/**
 * Billing & subscription stats from the local DB. Optional date range narrows
 * the "new subs/users in range" counters; everything else is point-in-time.
 *
 * MRR is computed strictly from `active` subs with monthly/annual plans —
 * trials don't contribute (intro €0.50 is one-time, not recurring). A
 * separate `mrrCommitted` projects what MRR will be once trials convert.
 */
export async function getBillingStats(opts?: { from?: Date; to?: Date }) {
  const db = await getDb();
  if (!db) return null;

  // Resolve the active monthly price once for this stats run so all the
  // numbers below are consistent. See the constants block above for the
  // caveat about historical subs at a different price.
  const MONTHLY_PRICE_EUR = (await getActiveMonthlyPrice()).eur;

  const now = new Date();
  const from = opts?.from ?? new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = opts?.to ?? now;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    allActiveSubs,        // status = active (paying)
    allTrialingSubs,      // status = trialing (in 48-hour trial)
    allCanceledSubs,
    pastDueCount,         // status = past_due (recurring charge failed)
    subsToCancel,         // active/trialing with cancelAtPeriodEnd = true
    subsThisMonth,
    subsThisWeek,
    subsToday,
    subsInRange,
    totalUsers,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    newUsersInRange,
  ] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.status, "active")),
    db.select().from(subscriptions).where(eq(subscriptions.status, "trialing")),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "canceled")),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "past_due")),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(
      sql`${subscriptions.cancelAtPeriodEnd} = true AND ${subscriptions.status} IN ('active', 'trialing')`
    ),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(
      sql`${subscriptions.createdAt} >= ${startOfMonth} AND ${subscriptions.status} IN ('active', 'trialing')`
    ),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(
      sql`${subscriptions.createdAt} >= ${startOfWeek} AND ${subscriptions.status} IN ('active', 'trialing')`
    ),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(
      sql`${subscriptions.createdAt} >= ${startOfDay} AND ${subscriptions.status} IN ('active', 'trialing')`
    ),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(
      sql`${subscriptions.createdAt} >= ${from} AND ${subscriptions.createdAt} <= ${to} AND ${subscriptions.status} IN ('active', 'trialing')`
    ),
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.createdAt} >= ${startOfDay}`),
    db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.createdAt} >= ${startOfWeek}`),
    db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.createdAt} >= ${startOfMonth}`),
    db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.createdAt} >= ${from} AND ${users.createdAt} <= ${to}`),
  ]);

  // Real MRR: subs currently paying recurring (plan = monthly | annual).
  // Trials (plan = 'trial') contribute 0 until Stripe charges them post-trial
  // and the webhook transitions plan → 'monthly'.
  const mrrPerSub = (plan: string | null) => {
    if (plan === "monthly") return MONTHLY_PRICE_EUR;
    if (plan === "annual") return ANNUAL_PRICE_EUR / 12;
    return 0;
  };
  let mrr = 0;
  let mrrCommitted = 0;
  // Count active rows: pay-what-you're-on for MRR, but project every live sub
  // (trial included) at €19.99/mo for MRR comprometido, since trials convert
  // to monthly unless cancelled.
  for (const sub of allActiveSubs) {
    mrr += mrrPerSub(sub.plan);
    mrrCommitted += sub.plan === "trial" ? MONTHLY_PRICE_EUR : mrrPerSub(sub.plan);
  }
  // allTrialingSubs is rarely populated in this app (we use status='active' +
  // plan='trial' during the trial period), but count it defensively in case a
  // sub lands in Stripe-native trialing state via webhook.
  for (const sub of allTrialingSubs) {
    mrrCommitted += sub.plan === "annual" ? ANNUAL_PRICE_EUR / 12 : MONTHLY_PRICE_EUR;
  }

  // New-subs-by-month chart (12-month rolling). Counts only successful subs
  // (any non-incomplete status). Revenue per month sums what each sub paid:
  // trial month gets €0.50 intro, monthly converts to €19.99 from month 2.
  const monthlySubs: { month: string; revenue: number; subs: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthSubs = await db.select().from(subscriptions).where(
      sql`${subscriptions.createdAt} >= ${d} AND ${subscriptions.createdAt} < ${end} AND ${subscriptions.status} IN ('active', 'trialing', 'canceled')`
    );
    let rev = 0;
    for (const s of monthSubs) {
      // Each new sub triggered an intro €0.50 charge.
      rev += INTRO_PRICE_EUR;
      // Plus, if active monthly, recurring €19.99 (skip annual / trial).
      if (s.plan === "monthly" && s.status === "active") rev += MONTHLY_PRICE_EUR;
      else if (s.plan === "annual" && s.status === "active") rev += ANNUAL_PRICE_EUR;
    }
    monthlySubs.push({
      month: d.toLocaleString("es-ES", { month: "short", year: "2-digit" }),
      revenue: Math.round(rev * 100) / 100,
      subs: monthSubs.length,
    });
  }

  const canceledTotal = Number(allCanceledSubs[0]?.count ?? 0);
  const activeAndTrialingTotal = allActiveSubs.length + allTrialingSubs.length;
  // Subs currently in their trial window regardless of how we track status.
  // In this app trials live as status='active' + plan='trial'; we also fold in
  // Stripe-native status='trialing' for robustness.
  const subsOnTrial =
    allActiveSubs.filter((s) => s.plan === "trial").length + allTrialingSubs.length;
  const subsPayingRecurring =
    allActiveSubs.filter((s) => s.plan === "monthly" || s.plan === "annual").length;

  return {
    // MRR / ARR
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    mrrCommitted: Math.round(mrrCommitted * 100) / 100,
    arrCommitted: Math.round(mrrCommitted * 12 * 100) / 100,
    // Subs counters
    activeSubscriptions: allActiveSubs.length,
    trialingSubscriptions: subsOnTrial,
    payingSubscriptions: subsPayingRecurring,
    pastDueSubscriptions: Number(pastDueCount[0]?.count ?? 0),
    subsAboutToCancel: Number(subsToCancel[0]?.count ?? 0),
    canceledSubscriptions: canceledTotal,
    // Periodic counts (point-in-time anchors)
    newSubsToday: Number(subsToday[0]?.count ?? 0),
    newSubsWeek: Number(subsThisWeek[0]?.count ?? 0),
    newSubsMonth: Number(subsThisMonth[0]?.count ?? 0),
    newSubsInRange: Number(subsInRange[0]?.count ?? 0),
    // Users
    totalUsers: Number(totalUsers[0]?.count ?? 0),
    newUsersToday: Number(newUsersToday[0]?.count ?? 0),
    newUsersWeek: Number(newUsersWeek[0]?.count ?? 0),
    newUsersMonth: Number(newUsersMonth[0]?.count ?? 0),
    newUsersInRange: Number(newUsersInRange[0]?.count ?? 0),
    monthlyRevenue: monthlySubs,
    churnRate: activeAndTrialingTotal > 0
      ? Math.round((canceledTotal / (activeAndTrialingTotal + canceledTotal)) * 100 * 10) / 10
      : 0,
    // Range echo (so the client can verify what was queried)
    range: { from: from.toISOString(), to: to.toISOString() },
  };
}

// In-memory cache for Stripe revenue queries — Stripe API can take 1-3s and
// the same date range is often re-queried as the admin clicks around.
const stripeRevenueCache = new Map<string, { data: any; expires: number }>();
const STRIPE_REVENUE_CACHE_MS = 60 * 1000;

// ─── Stripe coupons / promotion codes (F7) ────────────────────

/**
 * List active coupons + their redemption counts. Combines stripe.coupons.list
 * and stripe.promotionCodes.list so the admin sees both the "backend" coupon
 * and the user-facing code (e.g. BLACKFRIDAY50).
 */
export async function listStripeCoupons() {
  const { getStripe } = await import("./_core/stripe");
  const stripe = getStripe();
  const [coupons, promos] = await Promise.all([
    stripe.coupons.list({ limit: 100 }),
    stripe.promotionCodes.list({ limit: 100 }),
  ]);
  const byCouponId = new Map<string, any[]>();
  for (const p of promos.data as any[]) {
    const cid = typeof p.coupon === "string" ? p.coupon : p.coupon?.id;
    if (!cid) continue;
    if (!byCouponId.has(cid)) byCouponId.set(cid, []);
    byCouponId.get(cid)!.push({
      id: p.id, code: p.code, active: p.active,
      timesRedeemed: p.times_redeemed, maxRedemptions: p.max_redemptions,
      expiresAt: p.expires_at ? new Date(p.expires_at * 1000).toISOString() : null,
    });
  }
  return coupons.data.map((c: any) => ({
    id: c.id,
    name: c.name ?? c.id,
    percentOff: c.percent_off ?? null,
    amountOff: c.amount_off != null ? c.amount_off / 100 : null,
    currency: c.currency?.toUpperCase() ?? "EUR",
    duration: c.duration, // "once" | "forever" | "repeating"
    durationInMonths: c.duration_in_months ?? null,
    valid: c.valid,
    timesRedeemed: c.times_redeemed ?? 0,
    maxRedemptions: c.max_redemptions ?? null,
    promotionCodes: byCouponId.get(c.id) ?? [],
    created: new Date(c.created * 1000).toISOString(),
  }));
}

/**
 * Create a coupon + promotion code in one shot. Simpler UX than Stripe's
 * two-step model for ad-hoc campaigns.
 */
export async function createCoupon(opts: {
  code: string;
  percentOff?: number;
  amountOff?: number;
  duration: "once" | "forever" | "repeating";
  durationInMonths?: number;
  maxRedemptions?: number;
  expiresAtIso?: string;
}) {
  const { getStripe } = await import("./_core/stripe");
  const stripe = getStripe();

  if (!opts.percentOff && !opts.amountOff) {
    throw new Error("Must provide percentOff or amountOff");
  }

  const couponParams: any = {
    name: opts.code,
    duration: opts.duration,
  };
  if (opts.percentOff) couponParams.percent_off = opts.percentOff;
  if (opts.amountOff) {
    couponParams.amount_off = Math.round(opts.amountOff * 100);
    couponParams.currency = "eur";
  }
  if (opts.duration === "repeating" && opts.durationInMonths) {
    couponParams.duration_in_months = opts.durationInMonths;
  }
  if (opts.maxRedemptions) couponParams.max_redemptions = opts.maxRedemptions;
  const coupon = await stripe.coupons.create(couponParams);

  const promoParams: any = { coupon: coupon.id, code: opts.code };
  if (opts.maxRedemptions) promoParams.max_redemptions = opts.maxRedemptions;
  if (opts.expiresAtIso) promoParams.expires_at = Math.floor(new Date(opts.expiresAtIso).getTime() / 1000);
  const promo = await stripe.promotionCodes.create(promoParams);

  return {
    couponId: coupon.id,
    promoId: promo.id,
    code: promo.code,
  };
}

/**
 * Delete a coupon (and optionally its promotion codes become inactive).
 */
export async function deleteCoupon(couponId: string) {
  const { getStripe } = await import("./_core/stripe");
  const stripe = getStripe();
  await stripe.coupons.del(couponId);
  return { success: true };
}

/**
 * Per-charge listing for the Billing tab so admin can refund individual
 * charges without jumping to Stripe dashboard. Returns the last N charges
 * (most recent first) with owner email resolved from customer object.
 */
export async function getStripeChargesList(opts?: { limit?: number }) {
  const { getStripe } = await import("./_core/stripe");
  const stripe = getStripe();
  const limit = Math.min(100, opts?.limit ?? 50);

  const page = await stripe.charges.list({ limit, expand: ["data.customer"] });
  return page.data
    .filter((c: any) => c.paid && c.status === "succeeded")
    .map((c: any) => ({
      id: c.id,
      amountEur: c.amount / 100,
      refundedEur: (c.amount_refunded ?? 0) / 100,
      fullyRefunded: c.refunded ?? false,
      currency: c.currency?.toUpperCase() ?? "EUR",
      created: new Date(c.created * 1000).toISOString(),
      customerEmail:
        (typeof c.customer === "object" && c.customer && "email" in c.customer
          ? (c.customer as any).email
          : null) ?? c.billing_details?.email ?? null,
      customerId: typeof c.customer === "string" ? c.customer : (c.customer as any)?.id ?? null,
      description: c.description ?? null,
    }));
}

/**
 * Refund a Stripe charge. Returns the refund object. Partial refunds supported
 * via optional amountEur; if omitted, Stripe refunds the remaining balance.
 */
export async function refundStripeCharge(opts: { chargeId: string; amountEur?: number; reason?: "duplicate" | "fraudulent" | "requested_by_customer" }) {
  const { getStripe } = await import("./_core/stripe");
  const stripe = getStripe();
  const params: any = { charge: opts.chargeId };
  if (opts.amountEur !== undefined) params.amount = Math.round(opts.amountEur * 100);
  if (opts.reason) params.reason = opts.reason;
  const refund = await stripe.refunds.create(params);
  // Invalidate revenue cache so admin panel reflects the refund immediately.
  stripeRevenueCache.clear();
  return {
    id: refund.id,
    amountEur: (refund.amount ?? 0) / 100,
    status: refund.status,
    chargeId: refund.charge as string,
  };
}

/**
 * Real cash revenue from Stripe for a date range. Pulls all charges (paid &
 * succeeded) within the range and aggregates: gross amount, refunds, net.
 *
 * Returns euros. If Stripe is configured in another currency this would need
 * a conversion step — for now we assume EUR (matches our Stripe account).
 */
export async function getStripeRevenue(opts: { from: Date; to: Date }) {
  const cacheKey = `${opts.from.getTime()}-${opts.to.getTime()}`;
  const cached = stripeRevenueCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.data;

  const { getStripe } = await import("./_core/stripe");
  const stripe = getStripe();

  const fromTs = Math.floor(opts.from.getTime() / 1000);
  const toTs = Math.floor(opts.to.getTime() / 1000);

  let grossCents = 0;
  let refundedCents = 0;
  let chargesCount = 0;
  let refundsCount = 0;

  // Paginate through charges in range (max 100 per page).
  let hasMore = true;
  let startingAfter: string | undefined = undefined;
  while (hasMore) {
    const page: any = await stripe.charges.list({
      created: { gte: fromTs, lte: toTs },
      limit: 100,
      starting_after: startingAfter,
    });
    for (const charge of page.data) {
      if (!charge.paid || charge.status !== "succeeded") continue;
      grossCents += charge.amount;
      refundedCents += charge.amount_refunded ?? 0;
      chargesCount += 1;
      if ((charge.amount_refunded ?? 0) > 0) refundsCount += 1;
    }
    hasMore = page.has_more;
    if (hasMore) startingAfter = page.data[page.data.length - 1]?.id;
  }

  const grossEur = grossCents / 100;
  const refundedEur = refundedCents / 100;
  const netEur = grossEur - refundedEur;

  const data = {
    grossEur: Math.round(grossEur * 100) / 100,
    refundedEur: Math.round(refundedEur * 100) / 100,
    netEur: Math.round(netEur * 100) / 100,
    chargesCount,
    refundsCount,
    range: { from: opts.from.toISOString(), to: opts.to.toISOString() },
  };
  stripeRevenueCache.set(cacheKey, { data, expires: Date.now() + STRIPE_REVENUE_CACHE_MS });
  return data;
}

/**
 * Admin doc listing: every document joined with its owner. Supports a simple
 * search over filename/user email. Ordered by most recent first, capped at
 * 500 rows by default — the admin rarely needs more at once and pulling the
 * whole table via tRPC would balloon.
 */
export async function getAllDocuments(opts?: { search?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 500;
  const s = opts?.search?.trim();

  const base = db.select({
    id: documents.id,
    name: documents.name,
    fileKey: documents.fileKey,
    fileUrl: documents.fileUrl,
    fileSize: documents.fileSize,
    paymentStatus: documents.paymentStatus,
    createdAt: documents.createdAt,
    updatedAt: documents.updatedAt,
    userId: users.id,
    userEmail: users.email,
    userName: users.name,
  }).from(documents).leftJoin(users, eq(documents.userId, users.id));

  const query = s
    ? base.where(sql`${documents.name} LIKE ${"%" + s + "%"} OR ${users.email} LIKE ${"%" + s + "%"}`)
    : base;

  return query.orderBy(desc(documents.createdAt)).limit(limit);
}

/**
 * Top N users by storage used (sum of fileSize across their docs). Surfaces
 * heavy R2 consumers so the admin can investigate abuse or charge enterprise.
 */
export async function getStorageByUser(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    userId: users.id,
    email: users.email,
    name: users.name,
    totalBytes: sql<number>`COALESCE(SUM(${documents.fileSize}), 0)`,
    docCount: sql<number>`COUNT(${documents.id})`,
  }).from(users)
    .leftJoin(documents, eq(users.id, documents.userId))
    .groupBy(users.id, users.email, users.name)
    .orderBy(sql`COALESCE(SUM(${documents.fileSize}), 0) DESC`)
    .limit(limit);
}

/**
 * List of subs whose recurring charge failed. Stripe is automatically
 * retrying these — if retries exhaust the sub gets canceled. Surfacing
 * them in admin lets the operator reach out before that happens.
 *
 * Each row is enriched with the decline reason from Stripe so the operator
 * can see exactly why the charge failed (insufficient_funds, card_declined,
 * expired_card, etc.) without jumping to the Stripe dashboard.
 */
export async function getPastDueSubs() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    country: users.country,
    plan: subscriptions.plan,
    status: subscriptions.status,
    currentPeriodEnd: subscriptions.currentPeriodEnd,
    stripeCustomerId: subscriptions.stripeCustomerId,
    stripeSubscriptionId: subscriptions.stripeSubscriptionId,
  }).from(users)
    .innerJoin(subscriptions, eq(users.id, subscriptions.userId))
    .where(eq(subscriptions.status, "past_due"))
    .orderBy(subscriptions.currentPeriodEnd);

  if (rows.length === 0) return [];

  const { getStripe } = await import("./_core/stripe");
  const stripe = getStripe();

  // Fetch decline detail in parallel — past-due set is small (<20 typically).
  const enriched = await Promise.all(rows.map(async (row) => {
    const base = { ...row, declineCode: null as string | null, declineMessage: null as string | null, attemptCount: 0, nextAttemptAt: null as string | null, amountDueEur: null as number | null };
    if (!row.stripeSubscriptionId) return base;
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId, {
        expand: ["latest_invoice.payment_intent"],
      }) as any;
      const invoice = sub.latest_invoice;
      if (!invoice) return base;
      base.attemptCount = invoice.attempt_count ?? 0;
      base.nextAttemptAt = invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null;
      base.amountDueEur = typeof invoice.amount_due === "number" ? invoice.amount_due / 100 : null;
      const pi = invoice.payment_intent;
      if (pi && typeof pi === "object" && pi.last_payment_error) {
        base.declineCode = pi.last_payment_error.decline_code ?? pi.last_payment_error.code ?? null;
        base.declineMessage = pi.last_payment_error.message ?? null;
      }
    } catch {
      // Stripe fetch failed — leave nullable fields as null.
    }
    return base;
  }));

  return enriched;
}

/**
 * Finds subs created in the last N hours whose initial invoice did NOT
 * succeed — used to detect trials that were created but never collected
 * the 0,50€ intro charge. These are normally users who abandoned at the
 * 3DS screen, entered a bad card, or dropped off before `confirmPayment`.
 */
export async function getRecentSubsWithoutPayment(opts?: { hours?: number }) {
  const db = await getDb();
  if (!db) return [];
  const hours = opts?.hours ?? 24;
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const rows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    country: users.country,
    plan: subscriptions.plan,
    status: subscriptions.status,
    createdAt: subscriptions.createdAt,
    stripeCustomerId: subscriptions.stripeCustomerId,
    stripeSubscriptionId: subscriptions.stripeSubscriptionId,
  }).from(users)
    .innerJoin(subscriptions, eq(users.id, subscriptions.userId))
    .where(sql`${subscriptions.createdAt} >= ${since}`)
    .orderBy(desc(subscriptions.createdAt));

  if (rows.length === 0) return [];

  const { getStripe } = await import("./_core/stripe");
  const stripe = getStripe();

  const enriched = await Promise.all(rows.map(async (row) => {
    const base: any = {
      ...row,
      invoiceStatus: null as string | null,
      paymentIntentStatus: null as string | null,
      declineCode: null as string | null,
      declineMessage: null as string | null,
      amountDueEur: null as number | null,
      hostedInvoiceUrl: null as string | null,
      isSuspicious: false as boolean,
    };
    if (!row.stripeSubscriptionId || row.stripeSubscriptionId.startsWith("fake_sub_qa_")) {
      // Fake QA subs or missing Stripe ID → flag as suspicious-ish but distinct.
      base.isSuspicious = row.stripeSubscriptionId?.startsWith("fake_sub_qa_") ? false : true;
      return base;
    }
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId, {
        expand: ["latest_invoice.payment_intent"],
      }) as any;
      const invoice = sub.latest_invoice;
      if (!invoice) return base;
      base.invoiceStatus = invoice.status ?? null;
      base.amountDueEur = typeof invoice.amount_due === "number" ? invoice.amount_due / 100 : null;
      base.hostedInvoiceUrl = invoice.hosted_invoice_url ?? null;
      const pi = invoice.payment_intent;
      if (pi && typeof pi === "object") {
        base.paymentIntentStatus = pi.status ?? null;
        if (pi.last_payment_error) {
          base.declineCode = pi.last_payment_error.decline_code ?? pi.last_payment_error.code ?? null;
          base.declineMessage = pi.last_payment_error.message ?? null;
        }
      }
      // Suspicious = sub exists but invoice wasn't paid within the window.
      // `paid` invoices or `trialing` subs with amount_due=0 are healthy.
      base.isSuspicious = invoice.status !== "paid" && invoice.status !== "void";
    } catch {
      base.isSuspicious = true; // couldn't verify with Stripe — flag it
    }
    return base;
  }));

  // Surface suspicious first; fall back to the rest after.
  return enriched.sort((a: any, b: any) => Number(b.isSuspicious) - Number(a.isSuspicious));
}

/**
 * List of subs that are scheduled to cancel at the end of their period —
 * shows who's about to churn so the admin can reach out.
 */
export async function getSubsAboutToCancel() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    country: users.country,
    plan: subscriptions.plan,
    status: subscriptions.status,
    currentPeriodEnd: subscriptions.currentPeriodEnd,
    stripeCustomerId: subscriptions.stripeCustomerId,
  }).from(users)
    .innerJoin(subscriptions, eq(users.id, subscriptions.userId))
    .where(sql`${subscriptions.cancelAtPeriodEnd} = true AND ${subscriptions.status} IN ('active', 'trialing')`)
    .orderBy(subscriptions.currentPeriodEnd);
}

export async function getCanceledSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    country: users.country,
    subStatus: subscriptions.status,
    plan: subscriptions.plan,
    canceledAt: subscriptions.updatedAt,
    stripeCustomerId: subscriptions.stripeCustomerId,
  }).from(users)
    .innerJoin(subscriptions, eq(users.id, subscriptions.userId))
    .where(eq(subscriptions.status, "canceled"))
    .orderBy(desc(subscriptions.updatedAt));
}

// ─── Blog Posts ───────────────────────────────────────────────
export async function getBlogPosts(publishedOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select({
    id: blogPosts.id,
    slug: blogPosts.slug,
    title: blogPosts.title,
    excerpt: blogPosts.excerpt,
    category: blogPosts.category,
    tags: blogPosts.tags,
    readTime: blogPosts.readTime,
    published: blogPosts.published,
    publishedAt: blogPosts.publishedAt,
    updatedAt: blogPosts.updatedAt,
  }).from(blogPosts);
  if (publishedOnly) {
    return query.where(eq(blogPosts.published, true)).orderBy(desc(blogPosts.publishedAt));
  }
  return query.orderBy(desc(blogPosts.publishedAt));
}

export async function getBlogPost(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getBlogPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createBlogPost(data: InsertBlogPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blogPosts).values(data);
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.slug, data.slug)).limit(1);
  return rows[0];
}

export async function updateBlogPost(id: number, data: Partial<InsertBlogPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(blogPosts).set(data).where(eq(blogPosts.id, id));
  return getBlogPostById(id);
}

export async function deleteBlogPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

/**
 * Liveness probe for the core integrations. Each check returns ok/error +
 * latency so the admin dashboard can spot outages quickly. Stripe and R2 do
 * lightweight read-only calls; DB just runs `SELECT 1`; CloudConvert / Resend
 * only verify that the API keys are present (no paid call made).
 */
export async function getHealthChecks() {
  const runCheck = async <T,>(name: string, fn: () => Promise<T>): Promise<{ name: string; ok: boolean; latencyMs: number; detail?: string }> => {
    const t0 = Date.now();
    try {
      await fn();
      return { name, ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      return { name, ok: false, latencyMs: Date.now() - t0, detail: (err as Error).message };
    }
  };

  const [dbCheck, stripeCheck, r2Check, resendCheck, cloudConvertCheck] = await Promise.all([
    runCheck("Database (MySQL)", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB client not initialised");
      await db.execute(sql`SELECT 1`);
    }),
    runCheck("Stripe API", async () => {
      const { getStripe } = await import("./_core/stripe");
      const stripe = getStripe();
      // Cheapest read we can do — retrieve the account metadata.
      await stripe.balance.retrieve();
    }),
    runCheck("Cloudflare R2", async () => {
      const endpoint = process.env.R2_ENDPOINT;
      const key = process.env.R2_ACCESS_KEY_ID ?? process.env.CF_R2_ACCESS_KEY_ID;
      const bucket = process.env.R2_BUCKET_NAME ?? process.env.CF_R2_BUCKET_NAME;
      if (!endpoint || !key || !bucket) throw new Error("R2 credentials missing");
      // HEAD the bucket endpoint (no auth needed to confirm DNS/reachability).
      const resp = await fetch(endpoint, { method: "HEAD" });
      if (resp.status >= 500) throw new Error(`R2 endpoint returned ${resp.status}`);
    }),
    runCheck("Resend", async () => {
      if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
    }),
    runCheck("CloudConvert", async () => {
      if (!process.env.CLOUDCONVERT_API_KEY) throw new Error("CLOUDCONVERT_API_KEY not set");
    }),
  ]);

  return [dbCheck, stripeCheck, r2Check, resendCheck, cloudConvertCheck];
}

/**
 * Everything we know about a single user — basic info, subscriptions,
 * recent docs, messages they sent. Feeds the admin user-timeline modal.
 */
export async function getUserTimeline(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRow) return null;

  const [subs, docs, messages] = await Promise.all([
    db.select().from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt)),
    db.select({
      id: documents.id,
      name: documents.name,
      fileSize: documents.fileSize,
      paymentStatus: documents.paymentStatus,
      createdAt: documents.createdAt,
    }).from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt))
      .limit(50),
    db.select().from(contactMessages)
      .where(eq(contactMessages.userId, userId))
      .orderBy(desc(contactMessages.createdAt))
      .limit(20),
  ]);

  return {
    user: userRow,
    subscriptions: subs,
    documents: docs,
    messages,
  };
}

/**
 * QA-only: create a fake trial sub in local DB without touching Stripe.
 * Lets the admin test the trial-limit gate end-to-end without paying €0,50.
 * The "Activar 19,99€" upgrade button will fail because the stripeSubscriptionId
 * is synthetic — admin should then click Reset to clean up.
 */
export async function createFakeTrialSub(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Don't create if there's already an active/trialing/past_due sub.
  const existing = await getActiveSubscription(userId);
  if (existing && ["active", "trialing", "past_due"].includes(existing.status)) {
    return { success: false, error: "User already has an active sub" };
  }
  const now = new Date();
  const trialEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const syntheticSubId = `fake_sub_qa_${userId}_${Date.now()}`;
  await upsertSubscription({
    userId,
    stripeCustomerId: `fake_cus_qa_${userId}`,
    stripeSubscriptionId: syntheticSubId,
    plan: "trial",
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    cancelAtPeriodEnd: false,
  });
  await markDocumentsPaid(userId);
  return { success: true, stripeSubscriptionId: syntheticSubId, trialEnd: trialEnd.toISOString() };
}

/**
 * QA-only: delete the fake trial sub (identified by synthetic stripe id).
 */
export async function deleteFakeTrialSub(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result: any = await db.delete(subscriptions)
    .where(and(
      eq(subscriptions.userId, userId),
      like(subscriptions.stripeSubscriptionId, "fake_sub_qa_%"),
    ));
  return { success: true, affected: result.affectedRows ?? 0 };
}

// ─── Admin self-test helpers (for trial flow QA without real payments) ──

/**
 * Reset trial usage on all docs for the admin themselves — stamps firstDownloadedAt
 * back to NULL so the gate re-evaluates from scratch. Scoped to ONE user's own
 * docs for safety; does not touch anyone else.
 */
export async function resetMyTrialUsage(userId: number) {
  const db = await getDb();
  if (!db) return { success: false, affected: 0 };
  const result: any = await db.update(documents)
    .set({ firstDownloadedAt: null })
    .where(eq(documents.userId, userId));
  return { success: true, affected: result.affectedRows ?? 0 };
}

/**
 * Simulate the "2 downloads consumed" state by stamping firstDownloadedAt=now()
 * on up to 2 of the user's docs. If the user has fewer than 2 docs, stamps as
 * many as exist. Next download will trigger the trial-limit paywall.
 */
export async function simulateTrialLimitReached(userId: number) {
  const db = await getDb();
  if (!db) return { success: false, stamped: 0 };
  const rows = await db.select({ id: documents.id })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt))
    .limit(2);
  if (rows.length === 0) {
    return { success: false, stamped: 0, error: "You have no documents yet — upload one first." };
  }
  const now = new Date();
  for (const row of rows) {
    await db.update(documents)
      .set({ firstDownloadedAt: now })
      .where(eq(documents.id, row.id));
  }
  return { success: true, stamped: rows.length };
}

// ─── Trial usage limit (2 PDFs per €0.50 trial) ──────────────────

const TRIAL_DOWNLOAD_LIMIT_DEFAULT = 2;

async function readTrialLimit(): Promise<number> {
  const val = await getSiteSetting("trial_download_limit");
  const parsed = val ? parseInt(val, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : TRIAL_DOWNLOAD_LIMIT_DEFAULT;
}

/**
 * Stamp the document as downloaded (first time only). Used by the download
 * gate so re-downloads of the same doc don't count toward the trial limit.
 */
export async function recordDocumentDownload(userId: number, docId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(documents)
    .set({ firstDownloadedAt: new Date() })
    .where(and(
      eq(documents.id, docId),
      eq(documents.userId, userId),
      isNull(documents.firstDownloadedAt),
    ));
}

/**
 * How many distinct PDFs the user has downloaded during the current trial
 * period. Returns {count, limit, periodStart} — limit/periodStart null when
 * the user is not on a trial sub (caller should skip the gate in that case).
 */
export async function getTrialUsageCount(userId: number) {
  const db = await getDb();
  if (!db) return { count: 0, limit: null, periodStart: null, isTrialing: false };

  const sub = await getActiveSubscription(userId);
  if (!sub || sub.plan !== "trial") {
    return { count: 0, limit: null, periodStart: null, isTrialing: false };
  }
  const periodStart = sub.currentPeriodStart;
  if (!periodStart) {
    return { count: 0, limit: await readTrialLimit(), periodStart: null, isTrialing: true };
  }
  const [row] = await db.select({ count: sql<number>`count(*)` })
    .from(documents)
    .where(and(
      eq(documents.userId, userId),
      sql`${documents.firstDownloadedAt} IS NOT NULL`,
      sql`${documents.firstDownloadedAt} >= ${periodStart}`,
    ));
  return {
    count: Number(row?.count ?? 0),
    limit: await readTrialLimit(),
    periodStart: periodStart.toISOString(),
    isTrialing: true,
  };
}

/**
 * Gate for the download endpoint. Returns {allowed} plus context for the
 * client (reason, usage, limit) when blocked.
 */
export async function canDownloadForUser(userId: number, docId: number) {
  const db = await getDb();
  if (!db) return { allowed: false, reason: "db-unavailable" as const };

  const sub = await getActiveSubscription(userId);
  // Paying (monthly/annual active) → always allowed.
  if (sub && (sub.plan === "monthly" || sub.plan === "annual") && sub.status === "active") {
    return { allowed: true as const };
  }
  // No sub at all → normal paywall handles it; we don't gate here.
  if (!sub) return { allowed: true as const };
  // Trial sub: check re-download + usage.
  if (sub.plan === "trial") {
    const [doc] = await db.select({ id: documents.id, firstDownloadedAt: documents.firstDownloadedAt })
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, userId)))
      .limit(1);
    if (!doc) return { allowed: false, reason: "doc-not-found" as const };
    // Re-download of an already-counted doc — free.
    if (doc.firstDownloadedAt && sub.currentPeriodStart && doc.firstDownloadedAt >= sub.currentPeriodStart) {
      return { allowed: true as const };
    }
    const usage = await getTrialUsageCount(userId);
    if (usage.limit !== null && usage.count >= usage.limit) {
      return {
        allowed: false as const,
        reason: "trial-limit" as const,
        usage: usage.count,
        limit: usage.limit,
      };
    }
    return { allowed: true as const };
  }
  // past_due / incomplete / canceled trial → block.
  return { allowed: false, reason: "no-active-subscription" as const };
}

/**
 * Force-end the trial by telling Stripe to end it "now", which triggers the
 * €19.99 recurring charge against the saved card immediately. The existing
 * invoice.paid webhook will transition our local row to plan=monthly/status=active.
 * Returns {success, error?} so the caller can fall back to the full paywall
 * when the card is rejected.
 */
export async function upgradeTrialImmediately(userId: number) {
  const sub = await getActiveSubscription(userId);
  if (!sub) return { success: false as const, error: "No active subscription", code: "NO_SUB" as const };
  if (sub.plan !== "trial") return { success: false as const, error: "Not on trial", code: "NOT_TRIAL" as const };
  if (!sub.stripeSubscriptionId) return { success: false as const, error: "Stripe sub id missing", code: "NO_STRIPE_ID" as const };

  // Reject fake QA subs early — these only exist locally; Stripe knows nothing
  // about them, so trying to update them would 404. Surface a clear message.
  if (sub.stripeSubscriptionId.startsWith("fake_sub_qa_")) {
    return {
      success: false as const,
      error: "This is a QA test subscription. The upgrade button only works with real Stripe subscriptions — pay 0,50€ for real to test the upgrade flow.",
      code: "FAKE_QA_SUB" as const,
    };
  }

  const { getStripe } = await import("./_core/stripe");
  const stripe = getStripe();
  try {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      trial_end: "now",
      proration_behavior: "none",
    });
    const db = await getDb();
    if (db) {
      await db.update(subscriptions)
        .set({ plan: "monthly", status: "active" })
        .where(eq(subscriptions.id, sub.id));
    }
    return { success: true as const, chargedAmountEur: (await getActiveMonthlyPrice()).eur };
  } catch (err: any) {
    // Distinguish card-related Stripe errors (where re-entering a card might
    // help) from everything else (where retrying with the same card or a new
    // card won't help — sub doesn't exist, no default PM, etc.).
    const stripeCode: string | undefined = err?.code ?? err?.raw?.code;
    const cardCodes = new Set([
      "card_declined", "expired_card", "incorrect_cvc",
      "processing_error", "insufficient_funds",
    ]);
    const isCardIssue = stripeCode ? cardCodes.has(stripeCode) : false;
    return {
      success: false as const,
      error: err?.message ?? String(err),
      code: (isCardIssue ? "CARD_ERROR" : "STRIPE_ERROR") as "CARD_ERROR" | "STRIPE_ERROR",
    };
  }
}

// ─── Webhook events log (F2) ─────────────────────────────────────

/**
 * Persist a webhook delivery so admins can audit what Stripe sent us
 * and whether our handler succeeded. Call from the webhook handler.
 */
export async function recordWebhookEvent(opts: {
  provider?: string;
  eventId?: string;
  eventType: string;
  status: "ok" | "error";
  errorMessage?: string;
  durationMs?: number;
  payload?: unknown;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(webhookEvents).values({
      provider: opts.provider ?? "stripe",
      eventId: opts.eventId ?? null,
      eventType: opts.eventType,
      status: opts.status,
      errorMessage: opts.errorMessage ?? null,
      durationMs: opts.durationMs ?? 0,
      // Truncate payload to avoid blowing up the text column on huge events.
      payload: opts.payload ? JSON.stringify(opts.payload).slice(0, 8000) : null,
    });
  } catch (err) {
    console.error("[recordWebhookEvent] failed:", err);
  }
}

export async function getWebhookEvents(opts?: { limit?: number; type?: string; status?: "ok" | "error" }) {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(500, opts?.limit ?? 100);
  let q = db.select().from(webhookEvents);
  if (opts?.type) q = q.where(eq(webhookEvents.eventType, opts.type)) as any;
  if (opts?.status) q = q.where(eq(webhookEvents.status, opts.status)) as any;
  return q.orderBy(desc(webhookEvents.receivedAt)).limit(limit);
}

// ─── Audit log (S1) ──────────────────────────────────────────────

/**
 * Record an admin-initiated action so we have an immutable trail. Log
 * destructive / permission-changing actions at minimum (refund, delete,
 * promote, impersonate, update subscription).
 */
export async function recordAuditEntry(opts: {
  adminId: number;
  adminEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: unknown;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLog).values({
      adminId: opts.adminId,
      adminEmail: opts.adminEmail ?? null,
      action: opts.action,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      metadata: opts.metadata ? JSON.stringify(opts.metadata).slice(0, 4000) : null,
      ipAddress: opts.ipAddress ?? null,
    });
  } catch (err) {
    console.error("[recordAuditEntry] failed:", err);
  }
}

export async function getAuditLog(opts?: { limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(500, opts?.limit ?? 100);
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}

// ─── User admin notes (U3) ───────────────────────────────────────

export async function setUserAdminNotes(userId: number, notes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ adminNotes: notes }).where(eq(users.id, userId));
}

// ─── Cancellation reason capture (F4) ────────────────────────────

export async function setCancelReason(opts: {
  userId: number;
  reason: "too_expensive" | "not_using" | "missing_feature" | "bug_or_issue" | "switched_tool" | "temporary" | "other";
  feedback?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Apply to the user's active-ish subscription so the reason is stored next
  // to the actual billing row. Status filter keeps us away from old canceled rows.
  await db.update(subscriptions)
    .set({ cancelReason: opts.reason, cancelFeedback: opts.feedback ?? null })
    .where(and(
      eq(subscriptions.userId, opts.userId),
      sql`${subscriptions.status} IN ('active', 'trialing', 'canceled', 'past_due')`
    ));
}

/**
 * MRR by country — groups active subs by the user's country. Feeds a
 * geo distribution card on the admin dashboard. Uses the same hardcoded
 * monthly/annual pricing as getBillingStats so the numbers align.
 */
export async function getRevenueByCountry() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    country: users.country,
    plan: subscriptions.plan,
    count: sql<number>`count(*)`,
  }).from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .where(sql`${subscriptions.status} IN ('active', 'trialing')`)
    .groupBy(users.country, subscriptions.plan);

  const byCountry = new Map<string, { country: string; subs: number; mrrEur: number }>();
  for (const r of rows) {
    const c = r.country || "Desconocido";
    const existing = byCountry.get(c) || { country: c, subs: 0, mrrEur: 0 };
    existing.subs += Number(r.count);
    // Trials project to monthly price (consistent with mrrCommitted).
    if (r.plan === "monthly" || r.plan === "trial") existing.mrrEur += Number(r.count) * 19.99;
    else if (r.plan === "annual") existing.mrrEur += Number(r.count) * (99 / 12);
    byCountry.set(c, existing);
  }
  return Array.from(byCountry.values())
    .sort((a, b) => b.mrrEur - a.mrrEur)
    .map((r) => ({ ...r, mrrEur: Math.round(r.mrrEur * 100) / 100 }));
}

/**
 * Aggregated cancellation reasons for the admin dashboard.
 */
export async function getCancelReasonsAgg() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    reason: subscriptions.cancelReason,
    count: sql<number>`count(*)`,
  }).from(subscriptions)
    .where(sql`${subscriptions.cancelReason} IS NOT NULL`)
    .groupBy(subscriptions.cancelReason);
  return rows.map((r) => ({ reason: r.reason ?? "unknown", count: Number(r.count) }));
}
