ALTER TABLE `image_processing_jobs` ADD `lease_expires_at` integer;--> statement-breakpoint
ALTER TABLE `image_processing_jobs` ADD `consecutive_failures` integer DEFAULT 0 NOT NULL;