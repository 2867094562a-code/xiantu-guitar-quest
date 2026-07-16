import { eq } from "drizzle-orm";
import type { ChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { users } from "../../db/schema";

export async function ensureUser(identity: ChatGPTUser) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, identity.email)).limit(1);
  const now = new Date();

  if (existing[0]) {
    await db.update(users).set({
      displayName: identity.displayName,
      updatedAt: now,
    }).where(eq(users.id, existing[0].id));
    return { ...existing[0], displayName: identity.displayName, updatedAt: now };
  }

  const created = {
    id: crypto.randomUUID(),
    email: identity.email,
    displayName: identity.displayName,
    goalMinutes: 60,
    currentLevel: 1,
    streakDays: 0,
    totalXp: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(users).values(created);
  return created;
}
