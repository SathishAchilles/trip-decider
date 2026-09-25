CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`participant_id` text,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `availability` (
	`participant_id` text NOT NULL,
	`window_id` text NOT NULL,
	`answer` text NOT NULL,
	PRIMARY KEY(`participant_id`, `window_id`),
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`window_id`) REFERENCES `date_windows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `commits` (
	`participant_id` text NOT NULL,
	`option_key` text NOT NULL,
	`approved` integer NOT NULL,
	PRIMARY KEY(`participant_id`, `option_key`),
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cost_overrides` (
	`trip_id` text NOT NULL,
	`destination_id` text NOT NULL,
	`stay_per_night` integer NOT NULL,
	`daily_spend` integer NOT NULL,
	PRIMARY KEY(`trip_id`, `destination_id`),
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `date_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`label` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`display_name` text NOT NULL,
	`edit_token` text NOT NULL,
	`claimed` integer DEFAULT false NOT NULL,
	`home_city` text,
	`budget_comfort` integer,
	`budget_max` integer,
	`vibes` text,
	`hard_no_tags` text DEFAULT '[]' NOT NULL,
	`hard_no_text` text,
	`submitted_at` text,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`organiser_token` text NOT NULL,
	`deadline` text NOT NULL,
	`state` text DEFAULT 'OPEN' NOT NULL,
	`misery_threshold` real DEFAULT 0.35 NOT NULL,
	`commit_deadline` text,
	`locked_option_key` text,
	`created_at` text NOT NULL
);
