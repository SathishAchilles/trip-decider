CREATE TABLE `rankings` (
	`trip_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`model` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`trip_id`, `input_hash`),
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `trips` ADD `decision_snapshot` text;