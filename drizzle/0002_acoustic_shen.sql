CREATE TABLE "trip_together"."app_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip_together"."app_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trip_together"."trips" ADD COLUMN "admin_pin_hash" text;--> statement-breakpoint
ALTER TABLE "trip_together"."trips" ADD COLUMN "admin_pin_fails" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_together"."trips" ADD COLUMN "admin_pin_locked_until" text;