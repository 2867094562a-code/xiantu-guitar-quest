import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  goalMinutes: integer("goal_minutes").notNull().default(60),
  currentLevel: integer("current_level").notNull().default(1),
  streakDays: integer("streak_days").notNull().default(0),
  totalXp: integer("total_xp").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const courseProgress = sqliteTable("course_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  track: text("track", { enum: ["singing", "fingerstyle"] }).notNull(),
  stageId: text("stage_id").notNull(),
  status: text("status", { enum: ["locked", "ready", "active", "completed"] }).notNull().default("ready"),
  stars: integer("stars").notNull().default(0),
  bestScore: integer("best_score").notNull().default(0),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const practiceSessions = sqliteTable("practice_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseType: text("exercise_type", { enum: ["tuning", "spider", "chord", "rhythm", "song", "fingerstyle"] }).notNull(),
  exerciseId: text("exercise_id").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  bpm: integer("bpm"),
  score: integer("score"),
  painScore: integer("pain_score"),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }).notNull(),
});

export const scoreImports = sqliteTable("score_imports", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  track: text("track", { enum: ["singing", "fingerstyle"] }).notNull(),
  tempo: integer("tempo"),
  timeSignature: text("time_signature"),
  keySignature: text("key_signature"),
  staffCount: integer("staff_count"),
  measureCount: integer("measure_count"),
  noteCount: integer("note_count"),
  confidence: integer("confidence").notNull().default(0),
  recognizedText: text("recognized_text"),
  status: text("status", { enum: ["draft", "reviewed", "ready"] }).notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
