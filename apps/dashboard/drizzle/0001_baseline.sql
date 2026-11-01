CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid DEFAULT private.only_site_id() NOT NULL,
	"kind" text NOT NULL,
	"parent" uuid,
	"parent_kind" text,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"config" jsonb,
	"title" text,
	"body" jsonb,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"extras" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"file" jsonb,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"links" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text,
	"published_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_site_id_kind_unique" UNIQUE("site_id","id","kind"),
	CONSTRAINT "entries_parent_slug_unique" UNIQUE("parent","slug"),
	CONSTRAINT "entries_site_path_unique" UNIQUE("site_id","path"),
	CONSTRAINT "entries_kind" CHECK ("entries"."kind" in ('folder', 'document', 'image')),
	CONSTRAINT "entries_root" CHECK (("entries"."parent" is null) = ("entries"."path" = '') and ("entries"."parent" is not null or ("entries"."kind" = 'folder' and "entries"."slug" = ''))),
	CONSTRAINT "entries_parent_kind" CHECK ("entries"."parent" is null
				or ("entries"."kind" = 'document' and "entries"."parent_kind" = 'folder')
				or ("entries"."kind" in ('folder', 'image') and "entries"."parent_kind" in ('folder', 'document'))),
	CONSTRAINT "entries_slug_format" CHECK ("entries"."path" = ''
				or ("entries"."kind" = 'image' and "entries"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*[.](png|jpg|jpeg|webp|avif|gif|svg)$')
				or ("entries"."kind" <> 'image' and "entries"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')),
	CONSTRAINT "entries_path_ends_in_slug" CHECK ("entries"."path" = "entries"."slug" or right("entries"."path", length("entries"."slug") + 1) = '/' || "entries"."slug"),
	CONSTRAINT "entries_document_columns" CHECK ("entries"."kind" <> 'document' or ("entries"."title" is not null and "entries"."title" <> '' and "entries"."status" is not null)),
	CONSTRAINT "entries_other_columns" CHECK ("entries"."kind" = 'document' or ("entries"."title" is null and "entries"."body" is null and "entries"."status" is null
				and "entries"."published_at" is null and "entries"."attributes" = '{}' and "entries"."extras" = '{}'
				and "entries"."tags" = '{}' and "entries"."links" = '{}')),
	CONSTRAINT "entries_config" CHECK ("entries"."config" is null or ("entries"."kind" <> 'image' and jsonb_typeof("entries"."config") = 'object')),
	CONSTRAINT "entries_file" CHECK (("entries"."kind" = 'image') = ("entries"."file" is not null) and ("entries"."file" is null or jsonb_typeof("entries"."file") = 'object')),
	CONSTRAINT "entries_json_shapes" CHECK (jsonb_typeof("entries"."attributes") = 'object' and jsonb_typeof("entries"."extras") = 'object'
				and ("entries"."body" is null or jsonb_typeof("entries"."body") = 'object')),
	CONSTRAINT "entries_status" CHECK ("entries"."status" in ('draft', 'published')),
	CONSTRAINT "entries_published_has_date" CHECK (("entries"."status" = 'published') = ("entries"."published_at" is not null)),
	CONSTRAINT "entries_published_at_ms" CHECK ("entries"."published_at" = date_trunc('milliseconds', "entries"."published_at")),
	CONSTRAINT "entries_tags" CHECK (cardinality("entries"."tags") <= 20 and array_position("entries"."tags", null) is null
				and array_to_string("entries"."tags", ',') ~ '^([a-z0-9]+(-[a-z0-9]+)*)?(,[a-z0-9]+(-[a-z0-9]+)*)*$')
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "site_members" (
	"site_id" uuid DEFAULT private.only_site_id() NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_members_pkey" PRIMARY KEY("site_id","user_id"),
	CONSTRAINT "site_members_role" CHECK ("site_members"."role" in ('admin', 'editor', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text DEFAULT 'My site' NOT NULL,
	"title_template" text DEFAULT '%s' NOT NULL,
	"description" text,
	"site_url" text,
	"favicon_url" text,
	"social_image_url" text,
	"social_image_alt" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_slug_unique" UNIQUE("slug"),
	CONSTRAINT "sites_slug_format" CHECK ("sites"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "sites_title_template" CHECK (position('%s' in "sites"."title_template") > 0),
	CONSTRAINT "sites_no_empty_text" CHECK ("sites"."name" <> '' and "sites"."description" <> '' and "sites"."site_url" <> ''
				and "sites"."favicon_url" <> '' and "sites"."social_image_url" <> '' and "sites"."social_image_alt" <> '')
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_parent_fk" FOREIGN KEY ("site_id","parent","parent_kind") REFERENCES "public"."entries"("site_id","id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entries_site_parent_idx" ON "entries" USING btree ("site_id","parent");--> statement-breakpoint
CREATE INDEX "entries_listing_idx" ON "entries" USING btree ("site_id","parent","kind","status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "entries_path_prefix_idx" ON "entries" USING btree ("site_id","path" text_pattern_ops);--> statement-breakpoint
CREATE INDEX "entries_tags_idx" ON "entries" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "entries_links_idx" ON "entries" USING gin ("links");--> statement-breakpoint
CREATE INDEX "entries_attributes_idx" ON "entries" USING gin ("attributes" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "entries_created_by_idx" ON "entries" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "entries_updated_by_idx" ON "entries" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "site_members_user_id_idx" ON "site_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sites_updated_by_idx" ON "sites" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");