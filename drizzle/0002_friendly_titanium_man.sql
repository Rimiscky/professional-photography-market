CREATE TABLE `watermark_settings` (
	`image_id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'PLATFORM' NOT NULL,
	`text` text,
	`custom_asset_key` text,
	`opacity_percent` integer DEFAULT 28 NOT NULL,
	`size_percent` integer DEFAULT 22 NOT NULL,
	`position` text DEFAULT 'CENTER' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE cascade
);
