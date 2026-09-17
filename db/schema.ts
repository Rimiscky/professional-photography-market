import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  country: text("country"),
  preferredLanguage: text("preferred_language").notNull().default("fr"),
  status: text("status", { enum: ["ACTIVE", "SUSPENDED", "DELETED"] }).notNull().default("ACTIVE"),
  ...timestamps,
}, (t) => [uniqueIndex("users_email_unique").on(t.email)]);

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  code: text("code", { enum: ["CUSTOMER", "PHOTOGRAPHER", "MODERATOR", "ADMIN", "SUPER_ADMIN"] }).notNull(),
  label: text("label").notNull(),
}, (t) => [uniqueIndex("roles_code_unique").on(t.code)]);

export const userRoles = sqliteTable("user_roles", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "restrict" }),
  assignedAt: text("assigned_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [primaryKey({ columns: [t.userId, t.roleId] })]);

export const photographerProfiles = sqliteTable("photographer_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  city: text("city"),
  country: text("country"),
  websiteUrl: text("website_url"),
  avatarKey: text("avatar_key"),
  coverKey: text("cover_key"),
  verificationStatus: text("verification_status", { enum: ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] }).notNull().default("UNVERIFIED"),
  stripeAccountId: text("stripe_account_id"),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  ...timestamps,
}, (t) => [uniqueIndex("photographer_user_unique").on(t.userId), uniqueIndex("photographer_username_unique").on(t.username)]);

export const images = sqliteTable("images", {
  id: text("id").primaryKey(),
  photographerId: text("photographer_id").notNull().references(() => photographerProfiles.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  altText: text("alt_text"),
  category: text("category"),
  status: text("status", { enum: ["DRAFT", "UPLOADING", "PROCESSING", "READY", "PENDING_REVIEW", "PUBLISHED", "UNPUBLISHED", "REJECTED", "ARCHIVED", "ERROR"] }).notNull().default("DRAFT"),
  orientation: text("orientation", { enum: ["LANDSCAPE", "PORTRAIT", "SQUARE", "PANORAMIC"] }),
  width: integer("width"), height: integer("height"),
  copyrightOwner: text("copyright_owner").notNull(),
  rightsConfirmedAt: text("rights_confirmed_at"),
  publishedAt: text("published_at"),
  ...timestamps,
}, (t) => [uniqueIndex("images_slug_unique").on(t.slug), index("images_photographer_idx").on(t.photographerId), index("images_status_idx").on(t.status)]);

export const imageAssets = sqliteTable("image_assets", {
  id: text("id").primaryKey(),
  imageId: text("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["ORIGINAL", "THUMBNAIL", "SMALL", "MEDIUM", "LARGE", "WATERMARKED"] }).notNull(),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type").notNull(),
  bytes: integer("bytes").notNull(),
  width: integer("width"), height: integer("height"),
  isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex("image_asset_kind_unique").on(t.imageId, t.kind)]);

export const imageProcessingJobs = sqliteTable("image_processing_jobs", {
  id: text("id").primaryKey(),
  imageId: text("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["PENDING", "RUNNING", "SUCCEEDED", "FAILED"] }).notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  errorCode: text("error_code"),
  availableAt: text("available_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [index("processing_jobs_status_idx").on(t.status, t.availableAt), uniqueIndex("processing_jobs_image_unique").on(t.imageId)]);

export const licenseTemplates = sqliteTable("license_templates", {
  id: text("id").primaryKey(), code: text("code").notNull(), name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true), ...timestamps,
}, (t) => [uniqueIndex("license_template_code_unique").on(t.code)]);

export const licenseVersions = sqliteTable("license_versions", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => licenseTemplates.id, { onDelete: "restrict" }),
  version: integer("version").notNull(), summary: text("summary").notNull(), terms: text("terms").notNull(),
  legalReviewStatus: text("legal_review_status", { enum: ["DRAFT", "REVIEW_REQUIRED", "APPROVED"] }).notNull().default("REVIEW_REQUIRED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex("license_version_unique").on(t.templateId, t.version)]);

export const imageLicensePrices = sqliteTable("image_license_prices", {
  imageId: text("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  licenseVersionId: text("license_version_id").notNull().references(() => licenseVersions.id, { onDelete: "restrict" }),
  amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull().default("EUR"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
}, (t) => [primaryKey({ columns: [t.imageId, t.licenseVersionId] })]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: text("status", { enum: ["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED", "PARTIALLY_REFUNDED", "REFUNDED"] }).notNull().default("PENDING"),
  currency: text("currency").notNull().default("EUR"), subtotalMinor: integer("subtotal_minor").notNull(),
  taxMinor: integer("tax_minor").notNull().default(0), totalMinor: integer("total_minor").notNull(), ...timestamps,
}, (t) => [index("orders_customer_idx").on(t.customerId), index("orders_status_idx").on(t.status)]);

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  imageId: text("image_id").notNull().references(() => images.id, { onDelete: "restrict" }),
  photographerId: text("photographer_id").notNull().references(() => photographerProfiles.id, { onDelete: "restrict" }),
  licenseVersionId: text("license_version_id").notNull().references(() => licenseVersions.id, { onDelete: "restrict" }),
  unitAmountMinor: integer("unit_amount_minor").notNull(), platformFeeMinor: integer("platform_fee_minor").notNull(),
  sellerNetMinor: integer("seller_net_minor").notNull(), currency: text("currency").notNull(),
  licenseSnapshotJson: text("license_snapshot_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_seller_idx").on(t.photographerId)]);

export const paymentEvents = sqliteTable("payment_events", {
  id: text("id").primaryKey(), provider: text("provider").notNull(), providerEventId: text("provider_event_id").notNull(),
  eventType: text("event_type").notNull(), processedAt: text("processed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex("provider_event_unique").on(t.provider, t.providerEventId)]);

export const downloadEntitlements = sqliteTable("download_entitlements", {
  id: text("id").primaryKey(), orderItemId: text("order_item_id").notNull().references(() => orderItems.id, { onDelete: "restrict" }),
  customerId: text("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  remainingDownloads: integer("remaining_downloads"), expiresAt: text("expires_at"), revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex("download_order_item_unique").on(t.orderItemId)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(), actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(),
  metadataJson: text("metadata_json"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [index("audit_target_idx").on(t.targetType, t.targetId)]);

export const marketplaceSettings = sqliteTable("marketplace_settings", {
  key: text("key").primaryKey(), valueJson: text("value_json").notNull(),
  updatedByUserId: text("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
