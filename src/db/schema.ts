import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

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

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organiserToken: text("organiser_token").notNull(),
  deadline: text("deadline").notNull(),
  state: text("state").$type<TripState>().notNull().default("OPEN"),
  miseryThreshold: real("misery_threshold").notNull().default(0.35),
  commitDeadline: text("commit_deadline"),
  lockedOptionKey: text("locked_option_key"),
  // The ranking displayed when the commit round started; COMMIT and LOCKED decide from it.
  decisionSnapshot: text("decision_snapshot", { mode: "json" }).$type<unknown>(),
  createdAt: text("created_at").notNull(),
});

export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  editToken: text("edit_token").notNull(),
  claimed: integer("claimed", { mode: "boolean" }).notNull().default(false),
  homeCity: text("home_city"),
  budgetComfort: integer("budget_comfort"),
  budgetMax: integer("budget_max"),
  vibes: text("vibes", { mode: "json" }).$type<Vibes>(),
  hardNoTags: text("hard_no_tags", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  hardNoText: text("hard_no_text"),
  submittedAt: text("submitted_at"),
});

export const dateWindows = sqliteTable("date_windows", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
});

export const availability = sqliteTable(
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
);

export const costOverrides = sqliteTable(
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
);

export const commits = sqliteTable(
  "commits",
  {
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    optionKey: text("option_key").notNull(),
    approved: integer("approved", { mode: "boolean" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.participantId, t.optionKey] })],
);

export const activity = sqliteTable("activity", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  participantId: text("participant_id"),
  kind: text("kind").$type<ActivityKind>().notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const rankings = sqliteTable(
  "rankings",
  {
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    inputHash: text("input_hash").notNull(),
    status: text("status").$type<RankingStatus>().notNull(),
    result: text("result", { mode: "json" }).$type<unknown>(),
    model: text("model").notNull(),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.inputHash] })],
);
