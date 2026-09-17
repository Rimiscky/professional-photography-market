CREATE TABLE `image_processing_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`image_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`available_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `processing_jobs_status_idx` ON `image_processing_jobs` (`status`,`available_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `processing_jobs_image_unique` ON `image_processing_jobs` (`image_id`);