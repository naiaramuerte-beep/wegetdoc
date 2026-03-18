import { and, desc, eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
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
    } else if (user.openId === ENV.ownerOpenId) {
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
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getAllUsers(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db
      .select()
      .from(users)
      .where(like(users.email, `%${search}%`))
      .orderBy(desc(users.createdAt));
  }
  return db.select().from(users).orderBy(desc(users.createdAt));
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
  stripePriceId?: string;
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

export async function cancelSubscriptionDb(userId: number) {
  const db = await getDb();
  if (!db) return;
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

export async function deleteUserById(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, userId));
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
}) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(documents).values(data);
  const result = await db.select().from(documents)
    .where(and(eq(documents.userId, data.userId), eq(documents.fileKey, data.fileKey))).limit(1);
  return result[0] ?? null;
}

export async function updateDocument(docId: number, userId: number, data: { name?: string; fileKey?: string; fileUrl?: string; fileSize?: number }) {
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
