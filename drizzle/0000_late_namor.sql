CREATE SCHEMA "trip_together";
--> statement-breakpoint
CREATE TABLE "trip_together"."activity" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"participant_id" text,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip_together"."activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trip_together"."availability" (
	"participant_id" text NOT NULL,
	"window_id" text NOT NULL,
	"answer" text NOT NULL,
	CONSTRAINT "availability_participant_id_window_id_pk" PRIMARY KEY("participant_id","window_id")
);
--> statement-breakpoint
ALTER TABLE "trip_together"."availability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trip_together"."commits" (
	"participant_id" text NOT NULL,
	"option_key" text NOT NULL,
	"approved" boolean NOT NULL,
	CONSTRAINT "commits_participant_id_option_key_pk" PRIMARY KEY("participant_id","option_key")
);
--> statement-breakpoint
ALTER TABLE "trip_together"."commits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trip_together"."cost_overrides" (
	"trip_id" text NOT NULL,
	"destination_id" text NOT NULL,
	"stay_per_night" integer NOT NULL,
	"daily_spend" integer NOT NULL,
	CONSTRAINT "cost_overrides_trip_id_destination_id_pk" PRIMARY KEY("trip_id","destination_id")
);
--> statement-breakpoint
ALTER TABLE "trip_together"."cost_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trip_together"."date_windows" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"label" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip_together"."date_windows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trip_together"."participants" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"display_name" text NOT NULL,
	"edit_token" text NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"home_city" text,
	"budget_comfort" integer,
	"budget_max" integer,
	"vibes" jsonb,
	"hard_no_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hard_no_text" text,
	"submitted_at" text
);
--> statement-breakpoint
ALTER TABLE "trip_together"."participants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trip_together"."rankings" (
	"trip_id" text NOT NULL,
	"input_hash" text NOT NULL,
	"status" text NOT NULL,
	"result" jsonb,
	"model" text NOT NULL,
	"error" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "rankings_trip_id_input_hash_pk" PRIMARY KEY("trip_id","input_hash")
);
--> statement-breakpoint
ALTER TABLE "trip_together"."rankings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trip_together"."trips" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"organiser_token" text NOT NULL,
	"deadline" text NOT NULL,
	"state" text DEFAULT 'OPEN' NOT NULL,
	"misery_threshold" double precision DEFAULT 0.35 NOT NULL,
	"commit_deadline" text,
	"locked_option_key" text,
	"decision_snapshot" jsonb,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip_together"."trips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trip_together"."activity" ADD CONSTRAINT "activity_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "trip_together"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_together"."availability" ADD CONSTRAINT "availability_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "trip_together"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_together"."availability" ADD CONSTRAINT "availability_window_id_date_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "trip_together"."date_windows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_together"."commits" ADD CONSTRAINT "commits_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "trip_together"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_together"."cost_overrides" ADD CONSTRAINT "cost_overrides_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "trip_together"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_together"."date_windows" ADD CONSTRAINT "date_windows_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "trip_together"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_together"."participants" ADD CONSTRAINT "participants_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "trip_together"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_together"."rankings" ADD CONSTRAINT "rankings_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "trip_together"."trips"("id") ON DELETE cascade ON UPDATE no action;