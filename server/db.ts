import { and, desc, eq, isNull, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertBlogPost,
  blogPosts,
  contactMessages,
  documents,
  folders,
  legalPages,
  siteSettings,
  subscriptions,
  teamInvitations,
  users,
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
// MRR pricing constants — should match Stripe configuration.
// trial = no recurring revenue (intro charge of €0.50 is one-time, not MRR);
// monthly = €19.99/mo; annual = €99/yr → ~€8.25/mo equivalent.
const MONTHLY_PRICE_EUR = 19.99;
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

  const now = new Date();
  const from = opts?.from ?? new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = opts?.to ?? now;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    allActiveSubs,        // status = active (paying)
    allTrialingSubs,      // status = trialing (in 7-day trial)
    allCanceledSubs,
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

  // Real MRR: only paying subs (status=active). Trials contribute 0 until they convert.
  const mrrPerSub = (plan: string | null) => {
    if (plan === "monthly") return MONTHLY_PRICE_EUR;
    if (plan === "annual") return ANNUAL_PRICE_EUR / 12;
    return 0;
  };
  let mrr = 0;
  for (const sub of allActiveSubs) mrr += mrrPerSub(sub.plan);

  // MRR comprometido: what MRR will be once all trials convert (active + trialing).
  let mrrCommitted = mrr;
  for (const sub of allTrialingSubs) {
    // Trial subs don't have plan set yet in some flows — assume monthly.
    mrrCommitted += mrrPerSub(sub.plan === "trial" ? "monthly" : sub.plan);
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

  return {
    // MRR / ARR
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    mrrCommitted: Math.round(mrrCommitted * 100) / 100,
    arrCommitted: Math.round(mrrCommitted * 12 * 100) / 100,
    // Subs counters
    activeSubscriptions: allActiveSubs.length,
    trialingSubscriptions: allTrialingSubs.length,
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
