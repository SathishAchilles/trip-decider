import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

export type TripState = "OPEN" | "SCORED" | "COMMIT" | "LOCKED";
export type AvailabilityAnswer = "yes" | "maybe" | "no";
export type Vibes = {
  beach: number;
  hills: number;
  heritage: number;
  adventure: number;
  chill: number;
  nightlife: number;
};
export type ActivityKind = "submitted" | "edited" | "state" | "veto";
export type RankingStatus = "pending" | "done" | "failed";

// Tables live outside `public`, which Supabase publishes through its REST API,
// and have RLS on with no policies: only the server's database role can use them.
export const tripTogether = pgSchema("trip_together");

// Timestamps are ISO-8601 UTC strings, as the app compares and formats them as text.
export const trips = tripTogether
  .table("trips", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organiserToken: text("organiser_token").notNull(),
    deadline: text("deadline").notNull(),
    state: text("state").$type<TripState>().notNull().default("OPEN"),
    miseryThreshold: doublePrecision("misery_threshold").notNull().default(0.35),
    commitDeadline: text("commit_deadline"),
    lockedOptionKey: text("locked_option_key"),
    // The ranking displayed when the commit round started; COMMIT and LOCKED decide from it.
    decisionSnapshot: jsonb("decision_snapshot").$type<unknown>(),
    createdAt: text("created_at").notNull(),
  })
  .enableRLS();

export const participants = tripTogether
  .table("participants", {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    editToken: text("edit_token").notNull(),
    claimed: boolean("claimed").notNull().default(false),
    homeCity: text("home_city"),
    budgetComfort: integer("budget_comfort"),
    budgetMax: integer("budget_max"),
    vibes: jsonb("vibes").$type<Vibes>(),
    hardNoTags: jsonb("hard_no_tags").$type<string[]>().notNull().default([]),
    hardNoText: text("hard_no_text"),
    submittedAt: text("submitted_at"),
  })
  .enableRLS();

export const dateWindows = tripTogether
  .table("date_windows", {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
  })
  .enableRLS();

export const availability = tripTogether
  .table(
    "availability",
    {
      participantId: text("participant_id")
        .notNull()
        .references(() => participants.id, { onDelete: "cascade" }),
      windowId: text("window_id")
        .notNull()
        .references(() => dateWindows.id, { onDelete: "cascade" }),
      answer: text("answer").$type<AvailabilityAnswer>().notNull(),
    },
    (t) => [primaryKey({ columns: [t.participantId, t.windowId] })],
  )
  .enableRLS();

export const costOverrides = tripTogether
  .table(
    "cost_overrides",
    {
      tripId: text("trip_id")
        .notNull()
        .references(() => trips.id, { onDelete: "cascade" }),
      destinationId: text("destination_id").notNull(),
      stayPerNight: integer("stay_per_night").notNull(),
      dailySpend: integer("daily_spend").notNull(),
    },
    (t) => [primaryKey({ columns: [t.tripId, t.destinationId] })],
  )
  .enableRLS();

export const commits = tripTogether
  .table(
    "commits",
    {
      participantId: text("participant_id")
        .notNull()
        .references(() => participants.id, { onDelete: "cascade" }),
      optionKey: text("option_key").notNull(),
      approved: boolean("approved").notNull(),
    },
    (t) => [primaryKey({ columns: [t.participantId, t.optionKey] })],
  )
  .enableRLS();

export const activity = tripTogether
  .table("activity", {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    participantId: text("participant_id"),
    kind: text("kind").$type<ActivityKind>().notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  })
  .enableRLS();

export const rankings = tripTogether
  .table(
    "rankings",
    {
      tripId: text("trip_id")
        .notNull()
        .references(() => trips.id, { onDelete: "cascade" }),
      inputHash: text("input_hash").notNull(),
      status: text("status").$type<RankingStatus>().notNull(),
      result: jsonb("result").$type<unknown>(),
      model: text("model").notNull(),
      error: text("error"),
      createdAt: text("created_at").notNull(),
      updatedAt: text("updated_at").notNull(),
    },
    (t) => [primaryKey({ columns: [t.tripId, t.inputHash] })],
  )
  .enableRLS();
